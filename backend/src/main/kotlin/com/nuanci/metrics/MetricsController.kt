package com.nuanci.metrics

import com.nuanci.admin.AdminSessions
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.server.ResponseStatusException
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class ChoiceCount(val step: String, val choiceId: String, val picks: Int)

data class SceneMetrics(
	val id: String,
	val number: Int,
	val title: String,
	val version: Int,
	val viewed: Int,
	val baseChosen: Int,
	val followUpChosen: Int,
	val completed: Int,
	val wrapViewed: Int,
	val nextClicked: Int,
	val alternativesViewed: Int,
	val shared: Int,
	val fromNext: Int,
	// 질문 1의 첫 답(시도마다 처음 고른 것) 수와 그중 O가 아닌 답 수. 오답률이 낮으면 맞혀도 남는 게 없는 쉬운 장면이다
	val firstTries: Int,
	val firstWrong: Int,
	val choices: List<ChoiceCount>,
)

// 방문자 기준 단계별 인원. 홈 방문 → 장면 시작 → 첫 선택 → 답변 완료 → 정리 화면 → 다음 장면
data class Funnel(val home: Int, val started: Int, val firstPick: Int, val answered: Int, val wrapped: Int, val next: Int)

// 사람 방문자가 어디까지 갔는지(가장 깊이 간 단계 하나로 센다). 테스트만 한 방문자는 뺀다.
// silent*: 화면을 한 번도 누르거나 스크롤하지 않음(잠깐 보고 닫았거나 봇일 수 있음), browsed: 홈을 둘러봤지만 장면은 안 엶,
// leftInLead: 장면을 열고 빌드업 대사 중에 나감, leftAtQuestion: 대사는 다 봤지만 답을 안 고름, leftMidScene: 답은 골랐지만 장면을 못 끝냄,
// oneScene / moreScenes: 장면을 1개 / 2개 이상 끝냄. engagementTracked가 false면 반응 기록이 생기기 전 기간이라 silent가 부풀려져 있다
data class Journey(
	val silentHome: Int,
	val browsed: Int,
	val silentScene: Int,
	val leftInLead: Int,
	val leftAtQuestion: Int,
	val leftMidScene: Int,
	val oneScene: Int,
	val moreScenes: Int,
	val engagementTracked: Boolean,
)

// 영어 사고 유형 테스트: 방문자 기준 소개 화면 → 시작 → 결과 → 공유, 친구 결과 링크를 연 사람과 거기서 테스트를 시작한 사람, 유형 분포
data class TestMetrics(val viewed: Int, val started: Int, val completed: Int, val shared: Int, val friendViewed: Int, val fromFriend: Int, val types: Map<String, Int>)

// 처음 들어온 채널별 방문자와 핵심 단계. 채널은 utm_source, 없으면 들어오기 전 사이트 주소, 둘 다 없으면 null(출처 없음)
data class SourceMetrics(val channel: String?, val visitors: Int, val sceneStarted: Int, val sceneCompleted: Int, val testStarted: Int, val testCompleted: Int, val shared: Int)

data class MetricsResponse(
	val funnel: Funnel,
	val visitors: Int,
	val attempts: Int,
	val events: Int,
	val internalVisitors: Int,
	val internalEvents: Int,
	// 내부 방문자 가운데 utm_source=ai로 들어온 AI 확인 방문
	val aiVisitors: Int,
	// 봇으로 분류해 지표에서 뺀 방문자(검색 크롤러, 링크 미리보기, 자동화 브라우저)
	val botVisitors: Int,
	val journey: Journey,
	val scenes: List<SceneMetrics>,
	val activeAccounts: Int,
	val registeredAccounts: Int,
	val unknownEvents: Int,
	val test: TestMetrics,
	val sources: List<SourceMetrics>,
	val daily: List<DailyMetrics>,
	val period: String,
)

data class DailyMetrics(val day: String, val visitors: Int, val newVisitors: Int, val accounts: Int, val completed: Int)

data class InternalVisitorRequest(val visitorId: UUID)

// 장면별 노출·첫 선택·완료·공유·다음 장면 유입과 선택지 분포를 시도(attempt) 기준으로 집계한다.
// 관리자로 로그인한 기기의 방문자는 내부 방문자로 등록해 두고 집계에서 뺀다
@RestController
@RequestMapping("/api/admin/metrics")
class MetricsController(
	private val jdbc: JdbcClient,
	private val sessions: AdminSessions,
) {
	@GetMapping
	fun metrics(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?, @RequestParam(defaultValue = "all") audience: String, @RequestParam(defaultValue = "all") period: String): MetricsResponse {
		sessions.require(auth)
		if (audience !in setOf("all", "guest", "member", "unknown")) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid audience")
		val range = AdminPeriod(period)
		val filter = (if (audience == "all") EXTERNAL else "$EXTERNAL and e.auth_state = '$audience'") + " and ${range.clause}"
		fun query(sql: String) = jdbc.sql(sql).params(range.params)

		val choices = query(
			"""
			select scene_id, step, choice_id, count(*) as picks
			from scene_event e
			where type = 'choice_selected' and $filter
			group by scene_id, step, choice_id
			order by picks desc
			""",
		).query { rs, _ -> rs.getString("scene_id") to ChoiceCount(rs.getString("step"), rs.getString("choice_id"), rs.getInt("picks")) }
			.list()
			.groupBy({ it.first }, { it.second })

		// 시도마다 질문 1에서 처음 고른 답을 그 버전의 판정과 맞춰 본다
		val firstTries = query(
			"""
			with first_pick as (
				select distinct on (attempt_id) attempt_id, scene_id, scene_version, choice_id
				from scene_event e where type = 'choice_selected' and step = 'base' and $filter
				order by attempt_id, created_at
			), verdicts as (
				select v.scene_id, v.version, c->>'id' as choice_id, c->>'verdict' as verdict
				from scene_version v cross join lateral json_array_elements(v.content->'base'->'choices') c
			)
			select f.scene_id,
				   count(*) filter (where d.verdict is not null) as tries,
				   count(*) filter (where d.verdict in ('meh', 'bad')) as wrong
			from first_pick f
			left join verdicts d on d.scene_id = f.scene_id and d.version = f.scene_version and d.choice_id = f.choice_id
			group by f.scene_id
			""",
		).query { rs, _ -> rs.getString("scene_id") to (rs.getInt("tries") to rs.getInt("wrong")) }.list().toMap()

		val scenes = query(
			"""
			select s.id, s.number, s.title, s.current_version,
				   count(distinct e.attempt_id) filter (where e.type = 'scene_viewed') as viewed,
				   count(distinct e.attempt_id) filter (where e.type = 'choice_selected' and e.step = 'base') as base_chosen,
				   count(distinct e.attempt_id) filter (where e.type = 'choice_selected' and e.step = 'followUp') as follow_up_chosen,
				   count(distinct e.attempt_id) filter (where e.type = 'scene_completed') as completed,
				   count(distinct e.attempt_id) filter (where e.type = 'wrap_viewed') as wrap_viewed,
				   count(distinct e.attempt_id) filter (where e.type = 'next_clicked') as next_clicked,
				   count(*) filter (where e.type = 'alternative_viewed') as alternatives_viewed,
				   count(*) filter (where e.type = 'share_link_copied') as shared,
				   count(distinct e.attempt_id) filter (where e.type = 'scene_viewed' and e.entry = 'next') as from_next
			from scene s
			left join scene_event e on e.scene_id = s.id and $filter
			where s.status = 'published'
			group by s.id, s.number, s.title, s.current_version, s.sort_order
			order by s.sort_order
			""",
		).query { rs, _ ->
			val id = rs.getString("id")
			SceneMetrics(
				id = id,
				number = rs.getInt("number"),
				title = rs.getString("title"),
				version = rs.getInt("current_version"),
				viewed = rs.getInt("viewed"),
				baseChosen = rs.getInt("base_chosen"),
				followUpChosen = rs.getInt("follow_up_chosen"),
				completed = rs.getInt("completed"),
				wrapViewed = rs.getInt("wrap_viewed"),
				nextClicked = rs.getInt("next_clicked"),
				alternativesViewed = rs.getInt("alternatives_viewed"),
				shared = rs.getInt("shared"),
				fromNext = rs.getInt("from_next"),
				firstTries = firstTries[id]?.first ?: 0,
				firstWrong = firstTries[id]?.second ?: 0,
				choices = choices[id].orEmpty(),
			)
		}.list()

		val totals = query("select count(distinct visitor_id) as v, count(distinct attempt_id) as a, count(*) as e from scene_event e where $filter")
			.query { rs, _ -> Triple(rs.getInt("v"), rs.getInt("a"), rs.getInt("e")) }
			.single()
		val funnel = query(
			"""
			select count(distinct visitor_id) filter (where type = 'home_viewed') as home,
				   count(distinct visitor_id) filter (where type = 'scene_viewed') as started,
				   count(distinct visitor_id) filter (where type = 'choice_selected' and step = 'base') as first_pick,
				   count(distinct visitor_id) filter (where type = 'scene_completed') as answered,
				   count(distinct visitor_id) filter (where type = 'wrap_viewed') as wrapped,
				   count(distinct visitor_id) filter (where type = 'next_clicked') as next
			from scene_event e where $filter
			""",
		).query { rs, _ -> Funnel(rs.getInt("home"), rs.getInt("started"), rs.getInt("first_pick"), rs.getInt("answered"), rs.getInt("wrapped"), rs.getInt("next")) }.single()
		val test = query(
			"""
			select count(distinct visitor_id) filter (where type = 'test_viewed') as viewed,
				   count(distinct visitor_id) filter (where type = 'test_started') as started,
				   count(distinct visitor_id) filter (where type = 'test_completed') as completed,
				   count(distinct visitor_id) filter (where type = 'test_shared') as shared,
				   count(distinct visitor_id) filter (where type = 'test_result_viewed' and entry = 'share') as friend_viewed,
				   count(distinct visitor_id) filter (where type = 'test_started' and entry = 'share') as from_friend
			from scene_event e where $filter
			""",
		).query { rs, _ -> listOf("viewed", "started", "completed", "shared", "friend_viewed", "from_friend").map { rs.getInt(it) } }.single()
		val testTypes = query("select choice_id, count(distinct visitor_id) as people from scene_event e where type = 'test_completed' and choice_id is not null and $filter group by choice_id")
			.query { rs, _ -> rs.getString("choice_id") to rs.getInt("people") }.list().toMap()
		val testMetrics = TestMetrics(test[0], test[1], test[2], test[3], test[4], test[5], testTypes)
		val sources = query(
			"""
			select coalesce(vs.source, vs.referrer) as channel,
				   count(distinct e.visitor_id) as visitors,
				   count(distinct e.visitor_id) filter (where e.type = 'scene_viewed') as scene_started,
				   count(distinct e.visitor_id) filter (where e.type = 'scene_completed') as scene_completed,
				   count(distinct e.visitor_id) filter (where e.type = 'test_started') as test_started,
				   count(distinct e.visitor_id) filter (where e.type = 'test_completed') as test_completed,
				   count(distinct e.visitor_id) filter (where e.type in ('test_shared', 'share_link_copied')) as shared
			from scene_event e
			left join visitor_source vs on vs.visitor_id = e.visitor_id
			where $filter
			group by coalesce(vs.source, vs.referrer)
			order by visitors desc
			limit 30
			""",
		).query { rs, _ ->
			SourceMetrics(rs.getString("channel"), rs.getInt("visitors"), rs.getInt("scene_started"), rs.getInt("scene_completed"), rs.getInt("test_started"), rs.getInt("test_completed"), rs.getInt("shared"))
		}.list()
		val journey = query(
			"""
			with v as (
				select visitor_id,
					   bool_or(type = 'page_engaged') as engaged,
					   bool_or(type = 'scene_viewed') as started,
					   bool_or(type = 'lead_finished') as lead_seen,
					   bool_or(type = 'choice_selected') as picked,
					   count(distinct scene_id) filter (where type = 'scene_completed') as done
				from scene_event e where $filter and type not like 'test%'
				group by visitor_id
			)
			select count(*) filter (where not started and not engaged) as silent_home,
				   count(*) filter (where not started and engaged) as browsed,
				   count(*) filter (where started and not picked and not engaged) as silent_scene,
				   count(*) filter (where started and not picked and engaged and not lead_seen) as left_in_lead,
				   count(*) filter (where started and not picked and engaged and lead_seen) as left_at_question,
				   count(*) filter (where picked and done = 0) as left_mid_scene,
				   count(*) filter (where done = 1) as one_scene,
				   count(*) filter (where done >= 2) as more_scenes,
				   (select count(*) > 0 from scene_event e where type = 'page_engaged' and ${range.clause}) as tracked
			from v
			""",
		).query { rs, _ ->
			Journey(
				rs.getInt("silent_home"), rs.getInt("browsed"), rs.getInt("silent_scene"), rs.getInt("left_in_lead"), rs.getInt("left_at_question"),
				rs.getInt("left_mid_scene"), rs.getInt("one_scene"), rs.getInt("more_scenes"), rs.getBoolean("tracked"),
			)
		}.single()
		val botVisitors = query("select count(*) from visitor_client where client = 'bot'").query(Int::class.java).single()
		val internalVisitors = query("select count(*) from internal_visitor").query(Int::class.java).single()
		val internalEvents = query("select count(*) from scene_event e where exists (select 1 from internal_visitor i where i.visitor_id = e.visitor_id)").query(Int::class.java).single()
		val aiVisitors = query("select count(*) from internal_visitor i join visitor_source s on s.visitor_id = i.visitor_id where s.source = '${com.nuanci.event.AI_SOURCE}'").query(Int::class.java).single()

		val activeAccounts = query("select count(distinct e.user_id) from scene_event e where $filter").query(Int::class.java).single()
		val registeredAccounts = query("""
			select count(*) from app_user u where not exists (
				select 1 from user_visitor uv join internal_visitor i on i.visitor_id = uv.visitor_id where uv.user_id = u.id
			)
		""").query(Int::class.java).single()
		val unknownEvents = query("select count(*) from scene_event e where $EXTERNAL and ${range.clause} and e.auth_state = 'unknown'").query(Int::class.java).single()
		val daily = query("""
			with first_seen as (
				select visitor_id, min(created_at) as first_at from scene_event e where $EXTERNAL group by visitor_id
			), days as (
				select generate_series(cast(:chartStart as date), cast(:chartEnd as date), interval '1 day')::date as day
			), activity as (
				select (e.created_at at time zone 'Asia/Seoul')::date as day,
					count(distinct e.visitor_id) as visitors,
					count(distinct e.visitor_id) filter (where (f.first_at at time zone 'Asia/Seoul')::date = (e.created_at at time zone 'Asia/Seoul')::date) as new_visitors,
					count(distinct e.user_id) as accounts,
					count(distinct e.attempt_id) filter (where e.type = 'scene_completed') as completed
				from scene_event e join first_seen f on f.visitor_id = e.visitor_id
				where $filter and e.created_at >= :chartInstant
				group by 1
			)
			select d.day::text, coalesce(a.visitors, 0) as visitors, coalesce(a.new_visitors, 0) as new_visitors,
				coalesce(a.accounts, 0) as accounts, coalesce(a.completed, 0) as completed
			from days d left join activity a on a.day = d.day order by d.day
		""").param("chartStart", range.chartStart.atZone(java.time.ZoneId.of("Asia/Seoul")).toLocalDate())
			.param("chartEnd", range.end.atZone(java.time.ZoneId.of("Asia/Seoul")).toLocalDate())
			.param("chartInstant", java.sql.Timestamp.from(range.chartStart))
			.query { rs, _ -> DailyMetrics(rs.getString("day"), rs.getInt("visitors"), rs.getInt("new_visitors"), rs.getInt("accounts"), rs.getInt("completed")) }.list()
		return MetricsResponse(funnel, totals.first, totals.second, totals.third, internalVisitors, internalEvents, aiVisitors, botVisitors, journey, scenes, activeAccounts, registeredAccounts, unknownEvents, testMetrics, sources, daily, period)
	}

	@PostMapping("/internal-visitors")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun markInternal(@RequestBody req: InternalVisitorRequest, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) {
		sessions.require(auth)
		jdbc.sql("insert into internal_visitor (visitor_id) values (:id) on conflict do nothing").param("id", req.visitorId).update()
	}

	@DeleteMapping("/internal-visitors/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun unmarkInternal(@PathVariable id: UUID, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) {
		sessions.require(auth)
		jdbc.sql("delete from internal_visitor where visitor_id = :id").param("id", id).update()
	}

	companion object {
		// 이용 지표에 세는 방문: 내부(관리자·AI 확인) 방문자와 봇으로 분류된 방문자를 뺀다
		const val EXTERNAL = "not exists (select 1 from internal_visitor i where i.visitor_id = e.visitor_id) " +
			"and not exists (select 1 from visitor_client c where c.visitor_id = e.visitor_id and c.client = 'bot')"
	}
}
