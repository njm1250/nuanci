package com.nuanci.operations

import com.nuanci.admin.AdminSessions
import com.nuanci.reward.RewardCatalog
import com.nuanci.reward.Rule
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

data class MilestoneItem(val id: String, val name: String)
data class ProgressionAdmin(val settings: ProgressionSettings, val defaults: ProgressionRules, val milestoneItems: List<MilestoneItem>, val boxPoolSize: Int)
data class PublicRanks(val version: Int, val ranks: List<RankRule>)

@RestController
class ProgressionSettingsController(private val store: ProgressionSettingsStore, private val sessions: AdminSessions) {
	@GetMapping("/api/admin/settings/progression")
	fun admin(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): ProgressionAdmin {
		sessions.require(auth)
		return ProgressionAdmin(store.current(), ProgressionSettingsStore.DEFAULTS,
			RewardCatalog.ITEMS.filter { it.rule is Rule.Milestone }.map { MilestoneItem(it.id, it.name) }, ProgressionSettingsStore.BOX_POOL_SIZE)
	}

	@PutMapping("/api/admin/settings/progression")
	fun save(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?, @RequestBody request: SaveProgressionSettings): ProgressionSettings {
		sessions.require(auth)
		return store.save(request)
	}

	@GetMapping("/api/progression/ranks")
	fun ranks(): PublicRanks = store.current().let { PublicRanks(it.version, it.rules.ranks) }

	@ExceptionHandler(ResponseStatusException::class)
	fun invalid(e: ResponseStatusException): ResponseEntity<Map<String, String>> =
		ResponseEntity.status(e.statusCode).body(mapOf("message" to (e.reason ?: "관리자 로그인이 필요합니다.")))
}
