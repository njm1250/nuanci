package com.nuanci.monitor

import com.nuanci.admin.AdminSessions
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

data class ErrorReport(val message: String = "", val stack: String? = null, val url: String? = null, val visitorId: UUID? = null)

data class ClientError(val id: Long, val message: String, val stack: String?, val url: String?, val userAgent: String?, val createdAt: Instant)

// 브라우저에서 난 오류를 받아 두고 관리자 화면에서 최근 것부터 본다.
// 오류가 한꺼번에 쏟아져도 DB가 넘치지 않게 1분에 받는 개수를 제한한다
@RestController
class ErrorController(
	private val jdbc: JdbcClient,
	private val sessions: AdminSessions,
) {
	private val windowStart = AtomicLong(0)
	private val count = AtomicInteger(0)

	@PostMapping("/api/errors")
	@ResponseStatus(HttpStatus.ACCEPTED)
	fun report(@RequestBody report: ErrorReport, @RequestHeader(HttpHeaders.USER_AGENT, required = false) userAgent: String?) {
		if (report.message.isBlank() || !allow()) return
		jdbc.sql("insert into client_error (message, stack, url, user_agent, visitor_id) values (:message, :stack, :url, :ua, :visitor)")
			.param("message", report.message.take(500))
			.param("stack", report.stack?.take(4000))
			.param("url", report.url?.take(500))
			.param("ua", userAgent?.take(300))
			.param("visitor", report.visitorId)
			.update()
	}

	@GetMapping("/api/admin/errors")
	fun recent(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): List<ClientError> {
		sessions.require(auth)
		return jdbc.sql("select id, message, stack, url, user_agent, created_at from client_error order by created_at desc limit 100")
			.query { rs, _ ->
				ClientError(rs.getLong("id"), rs.getString("message"), rs.getString("stack"), rs.getString("url"), rs.getString("user_agent"), rs.getTimestamp("created_at").toInstant())
			}.list()
	}

	private fun allow(): Boolean {
		val minute = System.currentTimeMillis() / 60_000
		if (windowStart.getAndSet(minute) != minute) count.set(0)
		return count.incrementAndGet() <= MAX_PER_MINUTE
	}

	companion object {
		private const val MAX_PER_MINUTE = 60
	}
}
