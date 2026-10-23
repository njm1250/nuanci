package com.nuanci.metrics

import com.nuanci.admin.AdminSessions
import org.springframework.http.HttpHeaders
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

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

data class MetricsResponse(val visitors: Int, val attempts: Int, val events: Int, val scenes: List<SceneMetrics>)

// 장면별 노출·첫 선택·완료·공유·다음 장면 유입과 선택지 분포를 시도(attempt) 기준으로 집계한다
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
			from scene_event
			where type = 'choice_selected'
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
			left join scene_event e on e.scene_id = s.id
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

		val totals = jdbc.sql("select count(distinct visitor_id) as v, count(distinct attempt_id) as a, count(*) as e from scene_event")
			.query { rs, _ -> Triple(rs.getInt("v"), rs.getInt("a"), rs.getInt("e")) }
			.single()

		return MetricsResponse(totals.first, totals.second, totals.third, scenes)
	}
}
