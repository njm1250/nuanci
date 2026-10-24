package com.nuanci.inquiry

import com.nuanci.account.AccountStore
import com.nuanci.account.SESSION_COOKIE
import com.nuanci.admin.AdminSessions
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class InquiryRequest(val kind: String = "", val message: String = "", val contact: String? = null, val page: String? = null, val visitorId: UUID? = null)

data class Inquiry(
	val id: Long,
	val kind: String,
	val message: String,
	val contact: String?,
	val page: String?,
	val email: String?,
	val userAgent: String?,
	val done: Boolean,
	val createdAt: Instant,
)

data class InquiryDone(val done: Boolean = true)

// 문의·오류 제보를 받아 두고 관리자 화면에서 최근 것부터 본다. 로그인했으면 계정을 함께 남겨 답장할 곳을 찾기 쉽게 한다.
// 같은 방문자가 짧은 시간에 계속 보내지 못하게 10분에 5개로 막는다
@RestController
class InquiryController(
	private val jdbc: JdbcClient,
	private val sessions: AdminSessions,
	private val accounts: AccountStore,
) {
	private val recent = ConcurrentHashMap<String, MutableList<Long>>()

	@PostMapping("/api/inquiries")
	@ResponseStatus(HttpStatus.ACCEPTED)
	fun send(
		@RequestBody req: InquiryRequest,
		@CookieValue(SESSION_COOKIE, required = false) token: String?,
		@RequestHeader(HttpHeaders.USER_AGENT, required = false) userAgent: String?,
	) {
		val message = req.message.trim()
		if (req.kind !in KINDS || message.length < 2 || message.length > MAX_MESSAGE || (req.contact?.length ?: 0) > MAX_CONTACT) {
			throw ResponseStatusException(HttpStatus.BAD_REQUEST)
		}
		if (!allow(req.visitorId?.toString() ?: userAgent ?: "unknown")) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)
		jdbc.sql(
			"""
			insert into inquiry (kind, message, contact, page, visitor_id, user_id, user_agent)
			values (:kind, :message, :contact, :page, :visitor, :user, :ua)
			""",
		).param("kind", req.kind).param("message", message).param("contact", req.contact?.trim()?.ifBlank { null })
			.param("page", req.page?.take(300)).param("visitor", req.visitorId).param("user", accounts.account(token)?.id)
			.param("ua", userAgent?.take(300)).update()
	}

	@GetMapping("/api/admin/inquiries")
	fun list(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): List<Inquiry> {
		sessions.require(auth)
		return jdbc.sql(
			"""
			select i.id, i.kind, i.message, i.contact, i.page, u.email, i.user_agent, i.done, i.created_at
			from inquiry i left join app_user u on u.id = i.user_id
			order by i.done, i.created_at desc limit 200
			""",
		).query { rs, _ ->
			Inquiry(
				rs.getLong("id"), rs.getString("kind"), rs.getString("message"), rs.getString("contact"), rs.getString("page"),
				rs.getString("email"), rs.getString("user_agent"), rs.getBoolean("done"), rs.getTimestamp("created_at").toInstant(),
			)
		}.list()
	}

	@PutMapping("/api/admin/inquiries/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun mark(@PathVariable id: Long, @RequestBody req: InquiryDone, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) {
		sessions.require(auth)
		jdbc.sql("update inquiry set done = :done where id = :id").param("done", req.done).param("id", id).update()
	}

	private fun allow(who: String): Boolean {
		val now = System.currentTimeMillis()
		val times = recent.computeIfAbsent(who) { mutableListOf() }
		synchronized(times) {
			times.removeIf { now - it > WINDOW_MS }
			if (times.size >= MAX_PER_WINDOW) return false
			times += now
		}
		return true
	}

	companion object {
		private val KINDS = setOf("error", "question", "scene", "idea")
		private const val MAX_MESSAGE = 2000
		private const val MAX_CONTACT = 200
		private const val MAX_PER_WINDOW = 5
		private const val WINDOW_MS = 10 * 60 * 1000L
	}
}
