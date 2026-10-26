package com.nuanci.reward

import com.nuanci.account.AccountStore
import com.nuanci.account.SESSION_COOKIE
import com.nuanci.operations.ProgressionRules
import com.nuanci.operations.ProgressionSettingsStore
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

data class RewardSyncRequest(val visitorId: UUID? = null, val cleared: List<String> = emptyList())

data class RewardClearRequest(val visitorId: UUID? = null, val sceneId: String = "", val via: String? = null)

data class RewardColorRequest(val visitorId: UUID? = null, val color: String = "")

data class RewardSeenRequest(val visitorId: UUID? = null, val ids: List<String> = emptyList())

// 깜짝 상자에서 나온 물건은 seen이 false인 동안 아직 열지 않은 상자로 보여준다
data class OwnedView(val color: String?, val reason: String, val sceneId: String?, val count: Int?, val group: String?, val seen: Boolean, val grantedAt: Instant)

// 아직 못 얻은 아이템은 이름 없이 조건 종류만 알려 준다. 장면 기념품은 어느 장면인지도 감춘다
data class LockView(val type: String, val remaining: Int? = null, val group: String? = null)

data class ItemView(val id: String, val kind: String, val slot: String?, val name: String?, val colors: List<String>, val owned: OwnedView?, val lock: LockView?)

data class NextView(val type: String, val name: String?, val remaining: Int)

data class RewardsResponse(val items: List<ItemView>, val next: NextView?, val shareCode: String?, val granted: List<String> = emptyList())

// 보상 상태와 지급. 로그인했으면 계정, 아니면 이 기기의 방문자 id가 주인이다
@RestController
@RequestMapping("/api/rewards")
class RewardController(private val rewards: RewardStore, private val accounts: AccountStore, private val settings: ProgressionSettingsStore) {
	private data class Owner(val id: UUID, val member: Boolean)

	// 지금 상태를 돌려준다. 예전 기기 기록(끝낸 장면)으로 받을 수 있었던 보상도 이때 채운다.
	// 로그인한 상태면 이 기기에서 방문자로 얻은 보상을 먼저 계정으로 옮긴다
	@PostMapping("/sync")
	fun sync(@CookieValue(SESSION_COOKIE, required = false) token: String?, @RequestBody req: RewardSyncRequest): RewardsResponse {
		val owner = owner(token, req.visitorId)
		if (owner.member) {
			req.visitorId?.let { rewards.mergeVisitor(it, owner.id) }
			accounts.addCleared(owner.id, req.cleared)
		} else {
			rewards.addVisitorCleared(owner.id, req.cleared)
		}
		val rules = settings.current().rules
		rewards.evaluate(owner.id, rewards.cleared(owner.id, owner.member), "sync", rules)
		return view(owner, rules = rules)
	}

	// 장면을 끝낼 때 부른다. 이번에 새로 얻은 보상 id를 함께 돌려줘서 완료 화면에서 보여준다
	@PostMapping("/clear")
	fun clear(@CookieValue(SESSION_COOKIE, required = false) token: String?, @RequestBody req: RewardClearRequest): RewardsResponse {
		val owner = owner(token, req.visitorId)
		if (owner.member) accounts.addCleared(owner.id, listOf(req.sceneId)) else rewards.addVisitorCleared(owner.id, listOf(req.sceneId))
		val cleared = rewards.cleared(owner.id, owner.member)
		if (req.sceneId !in cleared) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown scene")
		val rules = settings.current().rules
		val granted = rewards.evaluate(owner.id, cleared, "play", rules).map { it.rewardId }.toMutableList()
		val sharer = req.via?.let(rewards::shareOwner)
		if (sharer != null && sharer != owner.id && sharer != req.visitorId) {
			rewards.grantShare(owner.id, sharer, req.sceneId)?.let { granted += it.rewardId }
		}
		rewards.ensureShareCode(owner.id)
		return view(owner, granted, rules)
	}

	@PutMapping("/{id}/color")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun color(@CookieValue(SESSION_COOKIE, required = false) token: String?, @PathVariable id: String, @RequestBody req: RewardColorRequest) {
		val owner = owner(token, req.visitorId)
		if (req.color !in RewardCatalog.find(id)?.colors.orEmpty()) throw ResponseStatusException(HttpStatus.BAD_REQUEST)
		if (!rewards.setColor(owner.id, id, req.color)) throw ResponseStatusException(HttpStatus.NOT_FOUND)
	}

	@PostMapping("/seen")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun seen(@CookieValue(SESSION_COOKIE, required = false) token: String?, @RequestBody req: RewardSeenRequest) {
		rewards.markSeen(owner(token, req.visitorId).id, req.ids)
	}

	private fun owner(token: String?, visitorId: UUID?): Owner {
		accounts.account(token)?.let { return Owner(it.id, true) }
		return Owner(visitorId ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "visitor required"), false)
	}

	private fun view(owner: Owner, granted: List<String> = emptyList(), rules: ProgressionRules): RewardsResponse {
		val grants = rewards.grants(owner.id).associateBy { it.rewardId }
		val cleared = rewards.cleared(owner.id, owner.member)
		val count = cleared.size
		val items = RewardCatalog.configured(rules.milestones).map { def ->
			val grant = grants[def.id]
			val rule = def.rule
			ItemView(
				def.id, def.kind, def.slot, grant?.let { def.name }, def.colors,
				grant?.let { OwnedView(it.color, it.reason, it.sceneId, it.milestoneCount ?: (RewardCatalog.find(def.id)?.rule as? Rule.Milestone)?.count, (rule as? Rule.Bundle)?.group, it.seen, it.grantedAt) },
				if (grant != null) null else lock(rule, cleared),
			)
		}
		return RewardsResponse(items, next(grants, count, rules), rewards.shareCode(owner.id), granted)
	}

	private fun lock(rule: Rule, cleared: List<String>) = when (rule) {
		is Rule.Milestone -> LockView("milestone", (rule.count - cleared.size).coerceAtLeast(1))
		is Rule.Scene -> LockView("scene")
		is Rule.Bundle -> LockView("bundle", rule.sceneIds.count { it !in cleared }.coerceAtLeast(1), rule.group)
		Rule.Share -> LockView("share")
		Rule.Box -> LockView("box")
	}

	// 가장 가까운 다음 목표. 깜짝 상자는 무엇이 나올지 알리지 않는다
	private fun next(grants: Map<String, Grant>, count: Int, rules: ProgressionRules): NextView? {
		val item = RewardCatalog.configured(rules.milestones)
			.mapNotNull { def -> (def.rule as? Rule.Milestone)?.takeIf { def.id !in grants && it.count > count }?.let { def to it.count } }
			.minByOrNull { it.second }
		val poolLeft = RewardCatalog.ITEMS.count { it.rule == Rule.Box && it.id !in grants }
		val boxesOwned = grants.values.count { it.reason == "box" }
		val box = rules.boxes.drop(boxesOwned).firstOrNull { it > count }?.takeIf { poolLeft > 0 }
		return when {
			item != null && (box == null || item.second <= box) -> NextView("item", item.first.name, item.second - count)
			box != null -> NextView("box", null, box - count)
			else -> null
		}
	}
}
