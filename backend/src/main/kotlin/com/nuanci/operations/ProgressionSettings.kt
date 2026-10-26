package com.nuanci.operations

import com.nuanci.reward.RewardCatalog
import com.nuanci.reward.Rule
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.json.JsonMapper
import java.time.Instant

data class RankRule(val min: Int, val name: String)
data class ProgressionRules(val ranks: List<RankRule>, val milestones: Map<String, Int>, val boxes: List<Int>)
data class ProgressionSettings(val version: Int, val updatedAt: Instant?, val rules: ProgressionRules)
data class SaveProgressionSettings(val version: Int, val rules: ProgressionRules)

@Service
class ProgressionSettingsStore(private val jdbc: JdbcClient, private val mapper: JsonMapper) {
	fun current(): ProgressionSettings = jdbc.sql("select version, rules, updated_at from progression_settings where id = 1")
		.query { rs, _ -> ProgressionSettings(rs.getInt("version"), rs.getTimestamp("updated_at").toInstant(), mapper.readValue(rs.getString("rules"), ProgressionRules::class.java)) }
		.optional().orElse(ProgressionSettings(0, null, DEFAULTS))

	// 다른 관리 화면에서 먼저 저장한 내용을 덮어쓰지 않도록 버전을 확인한다.
	@Transactional
	fun save(request: SaveProgressionSettings): ProgressionSettings {
		val rules = validate(request.rules)
		if (request.version < 0) invalid("설정 버전이 올바르지 않습니다.")
		val json = mapper.writeValueAsString(rules)
		val changed = if (request.version == 0) {
			jdbc.sql("insert into progression_settings(id, version, rules, updated_at) values (1, 1, cast(:rules as jsonb), now()) on conflict do nothing")
				.param("rules", json).update()
		} else {
			jdbc.sql("update progression_settings set version = version + 1, rules = cast(:rules as jsonb), updated_at = now() where id = 1 and version = :version")
				.param("rules", json).param("version", request.version).update()
		}
		if (changed == 0) throw ResponseStatusException(HttpStatus.CONFLICT, "다른 창에서 설정이 변경됐습니다. 최신 설정을 다시 불러와 주세요.")
		return current()
	}

	fun validate(rules: ProgressionRules): ProgressionRules {
		if (rules.ranks.size !in 1..30 || rules.ranks.first().min != 0) invalid("직급은 1~30개이며 첫 직급은 0개부터 시작해야 합니다.")
		if (rules.ranks.any { it.min !in 0..10000 || it.name.trim().length !in 1..20 || it.name.any(Char::isISOControl) }) invalid("직급 이름은 1~20자, 완료 장면 수는 0~10,000 사이여야 합니다.")
		if (rules.ranks.zipWithNext().any { (a, b) -> a.min >= b.min }) invalid("승급 기준은 중복 없이 작은 수부터 입력해 주세요.")
		if (rules.ranks.map { it.name.trim() }.distinct().size != rules.ranks.size) invalid("직급 이름은 중복될 수 없습니다.")
		if (rules.milestones.keys != DEFAULTS.milestones.keys || rules.milestones.values.any { it !in 1..10000 }) invalid("모든 장면 수 보상의 기준을 1~10,000 사이로 입력해 주세요.")
		if (rules.boxes.size > BOX_POOL_SIZE || rules.boxes.any { it !in 1..10000 } || rules.boxes.zipWithNext().any { (a, b) -> a >= b }) invalid("상자는 최대 ${BOX_POOL_SIZE}개이며 지급 시점은 1~10,000 사이에서 중복 없이 작은 수부터 입력해 주세요.")
		return rules.copy(ranks = rules.ranks.map { it.copy(name = it.name.trim()) })
	}

	private fun invalid(message: String): Nothing = throw ResponseStatusException(HttpStatus.BAD_REQUEST, message)

	companion object {
		val BOX_POOL_SIZE = RewardCatalog.ITEMS.count { it.rule == Rule.Box }
		val DEFAULTS = ProgressionRules(
			listOf(0 to "인턴", 3 to "사원", 8 to "주임", 15 to "대리", 25 to "과장", 40 to "차장", 60 to "부장", 85 to "이사", 110 to "상무", 140 to "전무", 175 to "부사장", 215 to "사장", 260 to "회장").map { RankRule(it.first, it.second) },
			RewardCatalog.ITEMS.mapNotNull { def -> (def.rule as? Rule.Milestone)?.let { def.id to it.count } }.toMap(),
			RewardCatalog.BOXES,
		)
	}
}
