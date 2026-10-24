package com.nuanci.account

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.UUID

data class Account(val id: UUID, val email: String?, val name: String?, val picture: String?, val hero: String?, val wear: List<String>, val roomPlaced: List<String>, val badge: Int?)

// 사용자 계정, 로그인 세션, 계정에 저장한 끝낸 장면을 다룬다. 세션 토큰은 해시만 DB에 남긴다
@Service
class AccountStore(private val jdbc: JdbcClient) {
	private val random = SecureRandom()

	@Transactional
	fun upsertGoogle(profile: GoogleProfile): UUID {
		val now = Instant.now()
		return jdbc.sql(
			"""
			insert into app_user (id, provider, provider_id, email, name, picture, created_at)
			values (:id, 'google', :sub, :email, :name, :picture, :now)
			on conflict (provider, provider_id) do update set email = excluded.email, name = excluded.name, picture = excluded.picture
			returning id
			""",
		).param("id", UUID.randomUUID()).param("sub", profile.sub).param("email", profile.email)
			.param("name", profile.name).param("picture", profile.picture).param("now", java.sql.Timestamp.from(now))
			.query(UUID::class.java).single()
	}

	fun createSession(userId: UUID): String {
		val token = Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(32).also(random::nextBytes))
		val now = Instant.now()
		jdbc.sql("insert into user_session (token_hash, user_id, created_at, expires_at) values (:hash, :user, :now, :expires)")
			.param("hash", hash(token)).param("user", userId)
			.param("now", java.sql.Timestamp.from(now)).param("expires", java.sql.Timestamp.from(now.plus(SESSION_TTL)))
			.update()
		return token
	}

	fun account(token: String?): Account? {
		if (token.isNullOrBlank()) return null
		return jdbc.sql(
			"""
			select u.id, u.email, u.name, u.picture, u.hero, u.wear, u.room_placed, u.badge from user_session s join app_user u on u.id = s.user_id
			where s.token_hash = :hash and s.expires_at > now()
			""",
		).param("hash", hash(token))
			.query { rs, _ ->
				Account(
					rs.getObject("id", UUID::class.java), rs.getString("email"), rs.getString("name"), rs.getString("picture"),
					rs.getString("hero"), rs.getString("wear")?.split(",")?.filter { it.isNotBlank() }.orEmpty(),
					rs.getString("room_placed")?.split(",")?.filter { it.isNotBlank() }.orEmpty(),
					rs.getObject("badge") as Int?,
				)
			}
			.optional().orElse(null)
	}

	fun deleteSession(token: String?) {
		if (!token.isNullOrBlank()) jdbc.sql("delete from user_session where token_hash = :hash").param("hash", hash(token)).update()
	}

	fun cleared(userId: UUID): List<String> =
		jdbc.sql("select scene_id from user_cleared where user_id = :user order by cleared_at").param("user", userId).query(String::class.java).list().filterNotNull()

	// 있는 장면만 계정에 담는다. 이미 담긴 장면은 그대로 둔다
	fun addCleared(userId: UUID, sceneIds: Collection<String>) {
		if (sceneIds.isEmpty()) return
		jdbc.sql(
			"""
			insert into user_cleared (user_id, scene_id, cleared_at)
			select :user, s.id, now() from scene s where s.id in (:ids)
			on conflict do nothing
			""",
		).param("user", userId).param("ids", sceneIds.take(MAX_SYNC)).update()
	}

	// 같은 기기를 다른 계정으로 로그인하면 마지막 계정에 이어 붙인다
	fun linkVisitor(userId: UUID, visitorId: UUID) {
		jdbc.sql(
			"""
			insert into user_visitor (visitor_id, user_id, linked_at) values (:visitor, :user, now())
			on conflict (visitor_id) do update set user_id = excluded.user_id, linked_at = excluded.linked_at
			""",
		).param("visitor", visitorId).param("user", userId).update()
	}

	fun saveAvatar(userId: UUID, hero: String, wear: List<String>, placed: List<String>, badge: Int?) {
		jdbc.sql("update app_user set hero = :hero, wear = :wear, room_placed = :placed, badge = :badge where id = :id")
			.param("hero", hero).param("wear", wear.joinToString(",")).param("placed", placed.joinToString(","))
			.param("badge", badge).param("id", userId).update()
	}

	// 계정을 지우면 문의에 남은 계정 연결도 끊는다. 문의 내용은 답변을 위해 남긴다
	fun delete(userId: UUID) {
		jdbc.sql("update inquiry set user_id = null where user_id = :id").param("id", userId).update()
		jdbc.sql("delete from app_user where id = :id").param("id", userId).update()
	}

	private fun hash(token: String) = MessageDigest.getInstance("SHA-256").digest(token.toByteArray()).joinToString("") { "%02x".format(it) }

	companion object {
		val SESSION_TTL: Duration = Duration.ofDays(90)
		private const val MAX_SYNC = 1000
	}
}
