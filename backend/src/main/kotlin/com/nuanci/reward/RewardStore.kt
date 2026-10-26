package com.nuanci.reward

import com.nuanci.operations.ProgressionRules
import com.nuanci.operations.ProgressionSettingsStore
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.SecureRandom
import java.time.Instant
import java.util.UUID

data class Grant(val rewardId: String, val color: String?, val reason: String, val sceneId: String?, val seen: Boolean, val grantedAt: Instant, val milestoneCount: Int? = null)

// 보상 지급과 보관. 끝낸 장면이 늘 때마다 조건을 다시 보고, 아직 없는 것만 한 번씩 준다
@Service
class RewardStore(private val jdbc: JdbcClient, private val settings: ProgressionSettingsStore) {
	private val random = SecureRandom()

	fun grants(owner: UUID): List<Grant> =
		jdbc.sql("select reward_id, color, reason, scene_id, seen, granted_at, milestone_count from reward_grant where owner_id = :owner order by granted_at, reward_id")
			.param("owner", owner)
			.query { rs, _ -> Grant(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getBoolean(5), rs.getTimestamp(6).toInstant(), rs.getObject(7) as Int?) }
			.list()

	// 로그인한 사용자는 계정 기록을, 로그인 전이면 방문자 기록을 쓴다
	fun cleared(owner: UUID, member: Boolean): List<String> {
		val sql = if (member) "select scene_id from user_cleared where user_id = :owner" else "select scene_id from visitor_cleared where visitor_id = :owner"
		return jdbc.sql(sql).param("owner", owner).query(String::class.java).list().filterNotNull()
	}

	// 있는 장면만 남긴다. 계정 기록은 AccountStore가 따로 남기므로 여기서는 방문자 기록만 다룬다
	fun addVisitorCleared(visitor: UUID, sceneIds: Collection<String>) {
		if (sceneIds.isEmpty()) return
		jdbc.sql(
			"""
			insert into visitor_cleared (visitor_id, scene_id, cleared_at)
			select :visitor, s.id, now() from scene s where s.id in (:ids)
			on conflict do nothing
			""",
		).param("visitor", visitor).param("ids", sceneIds.take(MAX_SYNC)).update()
	}

	// 끝낸 장면 수와 목록으로 받을 수 있는 보상을 모두 준다. 이번에 새로 준 것만 돌려준다
	@Transactional
	fun evaluate(owner: UUID, cleared: List<String>, source: String): List<Grant> =
		evaluate(owner, cleared, source, settings.current().rules)

	@Transactional
	fun evaluate(owner: UUID, cleared: List<String>, source: String, rules: ProgressionRules): List<Grant> {
		// 같은 주인의 요청이 동시에 오면(페이지 첫 동기화와 장면 완료가 겹칠 때 등) 상자 개수를 둘 다 0으로 보고 더 줄 수 있어서, 주인별로 차례로 판단한다
		jdbc.sql("select pg_advisory_xact_lock(hashtext(:owner))").param("owner", owner.toString()).query { _, _ -> 0 }.list()
		val owned = grants(owner)
		val ids = owned.map { it.rewardId }.toMutableSet()
		val granted = mutableListOf<Grant>()
		fun give(def: RewardDef, reason: String, sceneId: String? = null) {
			insert(owner, def, reason, sceneId, source)?.let {
				granted += it
				ids += def.id
			}
		}
		for (def in RewardCatalog.configured(rules.milestones)) {
			if (def.id in ids) continue
			when (val rule = def.rule) {
				is Rule.Milestone -> if (cleared.size >= rule.count) give(def, "milestone")
				is Rule.Scene -> if (rule.sceneId in cleared) give(def, "scene", rule.sceneId)
				is Rule.Bundle -> if (cleared.containsAll(rule.sceneIds)) give(def, "bundle")
				else -> {}
			}
		}
		val opened = owned.count { it.reason == "box" }
		val due = rules.boxes.count { cleared.size >= it }
		repeat((due - opened).coerceAtLeast(0)) {
			val pool = RewardCatalog.ITEMS.filter { it.rule == Rule.Box && it.id !in ids }
			if (pool.isNotEmpty()) give(pool[random.nextInt(pool.size)], "box")
		}
		return granted
	}

	// 친구가 공유 링크로 장면을 끝냈을 때 링크 주인과 친구에게 같은 기념품을 준다. 이미 있으면 주지 않는다
	@Transactional
	fun grantShare(friend: UUID, sharer: UUID, sceneId: String): Grant? {
		val def = RewardCatalog.ITEMS.first { it.rule == Rule.Share }
		insert(sharer, def, "share", sceneId, "play")
		return insert(friend, def, "share", sceneId, "play")
	}

	fun setColor(owner: UUID, rewardId: String, color: String): Boolean =
		jdbc.sql("update reward_grant set color = :color where owner_id = :owner and reward_id = :id")
			.param("color", color).param("owner", owner).param("id", rewardId).update() > 0

	fun markSeen(owner: UUID, rewardIds: Collection<String>) {
		if (rewardIds.isEmpty()) return
		jdbc.sql("update reward_grant set seen = true where owner_id = :owner and reward_id in (:ids)")
			.param("owner", owner).param("ids", rewardIds.take(RewardCatalog.ITEMS.size)).update()
	}

	fun owns(owner: UUID, rewardId: String) =
		jdbc.sql("select count(*) from reward_grant where owner_id = :owner and reward_id = :id")
			.param("owner", owner).param("id", rewardId).query(Int::class.java).single() > 0

	// 로그인하면 이 기기에서 방문자로 얻은 보상, 끝낸 장면, 공유 코드를 계정으로 옮긴다
	@Transactional
	fun mergeVisitor(visitor: UUID, user: UUID) {
		jdbc.sql(
			"""
			insert into reward_grant (owner_id, reward_id, color, reason, scene_id, source, seen, granted_at, milestone_count)
			select :user, reward_id, color, reason, scene_id, source, seen, granted_at, milestone_count from reward_grant where owner_id = :visitor
			on conflict do nothing
			""",
		).param("user", user).param("visitor", visitor).update()
		jdbc.sql("delete from reward_grant where owner_id = :visitor").param("visitor", visitor).update()
		jdbc.sql(
			"""
			insert into user_cleared (user_id, scene_id, cleared_at)
			select :user, scene_id, cleared_at from visitor_cleared where visitor_id = :visitor
			on conflict do nothing
			""",
		).param("user", user).param("visitor", visitor).update()
		jdbc.sql("delete from visitor_cleared where visitor_id = :visitor").param("visitor", visitor).update()
		jdbc.sql("update share_code set owner_id = :user where owner_id = :visitor and not exists (select 1 from share_code where owner_id = :user)")
			.param("user", user).param("visitor", visitor).update()
	}

	fun shareCode(owner: UUID): String? =
		jdbc.sql("select code from share_code where owner_id = :owner").param("owner", owner).query(String::class.java).optional().orElse(null)

	fun ensureShareCode(owner: UUID): String {
		shareCode(owner)?.let { return it }
		val code = (1..CODE_LENGTH).map { CODE_CHARS[random.nextInt(CODE_CHARS.length)] }.joinToString("")
		jdbc.sql("insert into share_code (code, owner_id, created_at) values (:code, :owner, now()) on conflict do nothing")
			.param("code", code).param("owner", owner).update()
		return shareCode(owner) ?: code
	}

	// 코드 주인. 방문자 때 만든 코드라도 그 기기로 로그인했으면 계정을 주인으로 본다
	fun shareOwner(code: String): UUID? =
		jdbc.sql(
			"""
			select coalesce(v.user_id, c.owner_id) from share_code c left join user_visitor v on v.visitor_id = c.owner_id
			where c.code = :code
			""",
		).param("code", code).query(UUID::class.java).optional().orElse(null)

	fun deleteOwner(owner: UUID) {
		jdbc.sql("delete from reward_grant where owner_id = :owner").param("owner", owner).update()
		jdbc.sql("delete from share_code where owner_id = :owner").param("owner", owner).update()
	}

	private fun insert(owner: UUID, def: RewardDef, reason: String, sceneId: String?, source: String): Grant? {
		val now = Instant.now()
		val color = def.colors.firstOrNull()
		val inserted = jdbc.sql(
			"""
			insert into reward_grant (owner_id, reward_id, color, reason, scene_id, source, seen, granted_at, milestone_count)
			values (:owner, :id, :color, :reason, :scene, :source, false, :now, :milestone)
			on conflict do nothing
			""",
		).param("owner", owner).param("id", def.id).param("color", color).param("reason", reason)
			.param("scene", sceneId).param("source", source).param("now", java.sql.Timestamp.from(now))
			.param("milestone", (def.rule as? Rule.Milestone)?.count).update()
		return if (inserted > 0) Grant(def.id, color, reason, sceneId, false, now, (def.rule as? Rule.Milestone)?.count) else null
	}

	companion object {
		private const val MAX_SYNC = 1000
		private const val CODE_LENGTH = 8
		private const val CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789"
	}
}
