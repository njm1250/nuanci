package com.nuanci.event

import com.nuanci.metrics.MetricsController
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

data class TestTypeStats(val total: Int, val types: Map<String, Int>)

// 영어 사고 유형 테스트에서 유형별로 몇 명이 나왔는지 센다. 결과 카드에 "전체 참여자 중 N%"로 보여준다
@RestController
@RequestMapping("/api/test")
class TestStatsController(private val jdbc: JdbcClient) {
	@GetMapping("/types")
	fun types(): TestTypeStats {
		val types = jdbc.sql(
			"""
			select choice_id, count(distinct visitor_id) as people
			from scene_event e
			where type = 'test_completed' and choice_id is not null and ${MetricsController.EXTERNAL}
			group by choice_id
			""",
		).query { rs, _ -> rs.getString("choice_id") to rs.getInt("people") }.list().toMap()
		return TestTypeStats(types.values.sum(), types)
	}
}
