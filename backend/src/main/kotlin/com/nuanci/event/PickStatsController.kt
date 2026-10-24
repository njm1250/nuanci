package com.nuanci.event

import com.nuanci.metrics.MetricsController
import com.nuanci.scene.SceneRepository
import com.nuanci.scene.SceneStatus
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

data class StepPicks(val total: Int, val picks: Map<String, Int>)

data class PickStats(val base: StepPicks, val followUp: StepPicks)

// 공개 장면에서 사람들이 첫 답으로 무엇을 골랐는지 센다. 결과 화면에 "N%가 골랐어요"로 보여준다
@RestController
@RequestMapping("/api/scenes")
class PickStatsController(
	private val jdbc: JdbcClient,
	private val scenes: SceneRepository,
) {
	@GetMapping("/{id}/picks")
	fun picks(@PathVariable id: String): PickStats {
		if (scenes.findById(id).orElse(null)?.status != SceneStatus.PUBLISHED) throw ResponseStatusException(HttpStatus.NOT_FOUND)
		val rows = jdbc.sql(
			"""
			select step, choice_id, count(*) as picks
			from scene_event e
			where scene_id = :id and type = 'choice_selected' and ${MetricsController.EXTERNAL}
			group by step, choice_id
			""",
		).param("id", id).query { rs, _ -> Triple(rs.getString("step"), rs.getString("choice_id"), rs.getInt("picks")) }.list()
		fun step(name: String): StepPicks {
			val picks = rows.filter { it.first == name }.associate { it.second to it.third }
			return StepPicks(picks.values.sum(), picks)
		}
		return PickStats(step("base"), step("followUp"))
	}
}
