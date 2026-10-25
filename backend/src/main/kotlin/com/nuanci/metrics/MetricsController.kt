package com.nuanci.metrics

import com.nuanci.admin.AdminSessions
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
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
	val choices: List<ChoiceCount>,
)

// 방문자 기준 단계별 인원. 홈 방문 → 장면 시작 → 첫 선택 → 답변 완료 → 정리 화면 → 다음 장면
data class Funnel(val home: Int, val started: Int, val firstPick: Int, val answered: Int, val wrapped: Int, val next: Int)

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
	val scenes: List<SceneMetrics>,
	val activeAccounts: Int,
	val registeredAccounts: Int,
	val unknownEvents: Int,
	val test: TestMetrics,
	val sources: List<SourceMetrics>,
)

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
	fun metrics(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?, @RequestParam(defaultValue = "all") audience: String): MetricsResponse {
		sessions.require(auth)
		if (audience !in setOf("all", "guest", "member", "unknown")) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid audience")
		val filter = if (audience == "all") EXTERNAL else "$EXTERNAL and e.auth_state = '$audience'"

		val choices = jdbc.sql(
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

		val scenes = jdbc.sql(
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
				choices = choices[id].orEmpty(),
			)
		}.list()

		val totals = jdbc.sql("select count(distinct visitor_id) as v, count(distinct attempt_id) as a, count(*) as e from scene_event e where $filter")
			.query { rs, _ -> Triple(rs.getInt("v"), rs.getInt("a"), rs.getInt("e")) }
			.single()
		val funnel = jdbc.sql(
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
		val test = jdbc.sql(
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
		val testTypes = jdbc.sql("select choice_id, count(distinct visitor_id) as people from scene_event e where type = 'test_completed' and choice_id is not null and $filter group by choice_id")
			.query { rs, _ -> rs.getString("choice_id") to rs.getInt("people") }.list().toMap()
		val testMetrics = TestMetrics(test[0], test[1], test[2], test[3], test[4], test[5], testTypes)
		val sources = jdbc.sql(
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
		val internalVisitors = jdbc.sql("select count(*) from internal_visitor").query(Int::class.java).single()
		val internalEvents = jdbc.sql("select count(*) from scene_event e where not $EXTERNAL").query(Int::class.java).single()

		val activeAccounts = jdbc.sql("select count(distinct e.user_id) from scene_event e where $filter").query(Int::class.java).single()
		val registeredAccounts = jdbc.sql("""
			select count(*) from app_user u where not exists (
				select 1 from user_visitor uv join internal_visitor i on i.visitor_id = uv.visitor_id where uv.user_id = u.id
			)
		""").query(Int::class.java).single()
		val unknownEvents = jdbc.sql("select count(*) from scene_event e where $EXTERNAL and e.auth_state = 'unknown'").query(Int::class.java).single()
		return MetricsResponse(funnel, totals.first, totals.second, totals.third, internalVisitors, internalEvents, scenes, activeAccounts, registeredAccounts, unknownEvents, testMetrics, sources)
	}

	@PostMapping("/internal-visitors")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun markInternal(@RequestBody req: InternalVisitorRequest, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) {
		sessions.require(auth)
		jdbc.sql("insert into internal_visitor (visitor_id) values (:id) on conflict do nothing").param("id", req.visitorId).update()
	}

	companion object {
		const val EXTERNAL = "not exists (select 1 from internal_visitor i where i.visitor_id = e.visitor_id)"
	}
}
