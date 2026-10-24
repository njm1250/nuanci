package com.nuanci.metrics

import com.nuanci.admin.AdminSessions
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
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
	val alternativesViewed: Int,
	val shared: Int,
	val fromNext: Int,
	val choices: List<ChoiceCount>,
)

data class MetricsResponse(
	val visitors: Int,
	val attempts: Int,
	val events: Int,
	val internalVisitors: Int,
	val internalEvents: Int,
	val scenes: List<SceneMetrics>,
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
	fun metrics(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): MetricsResponse {
		sessions.require(auth)

		val choices = jdbc.sql(
			"""
			select scene_id, step, choice_id, count(*) as picks
			from scene_event e
			where type = 'choice_selected' and $EXTERNAL
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
				   count(*) filter (where e.type = 'alternative_viewed') as alternatives_viewed,
				   count(*) filter (where e.type = 'share_link_copied') as shared,
				   count(distinct e.attempt_id) filter (where e.type = 'scene_viewed' and e.entry = 'next') as from_next
			from scene s
			left join scene_event e on e.scene_id = s.id and $EXTERNAL
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
				alternativesViewed = rs.getInt("alternatives_viewed"),
				shared = rs.getInt("shared"),
				fromNext = rs.getInt("from_next"),
				choices = choices[id].orEmpty(),
			)
		}.list()

		val totals = jdbc.sql("select count(distinct visitor_id) as v, count(distinct attempt_id) as a, count(*) as e from scene_event e where $EXTERNAL")
			.query { rs, _ -> Triple(rs.getInt("v"), rs.getInt("a"), rs.getInt("e")) }
			.single()
		val internalVisitors = jdbc.sql("select count(*) from internal_visitor").query(Int::class.java).single()
		val internalEvents = jdbc.sql("select count(*) from scene_event e where not $EXTERNAL").query(Int::class.java).single()

		return MetricsResponse(totals.first, totals.second, totals.third, internalVisitors, internalEvents, scenes)
	}

	@PostMapping("/internal-visitors")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun markInternal(@RequestBody req: InternalVisitorRequest, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) {
		sessions.require(auth)
		jdbc.sql("insert into internal_visitor (visitor_id) values (:id) on conflict do nothing").param("id", req.visitorId).update()
	}

	companion object {
		private const val EXTERNAL = "not exists (select 1 from internal_visitor i where i.visitor_id = e.visitor_id)"
	}
}
