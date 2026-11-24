package com.nuanci.admin

import com.nuanci.config.NuanciProperties
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

// 관리자 계정은 환경변수 하나로 두고, 로그인 세션은 서버 메모리에 둔다. 서버를 다시 띄우면 다시 로그인해야 한다
@Component
class AdminSessions(private val props: NuanciProperties) {
	private val sessions = ConcurrentHashMap<String, Instant>()
	private val random = SecureRandom()
	private val failures = java.util.ArrayDeque<Instant>()

	fun login(id: String, password: String): String? {
		// 비밀번호를 여러 번 대입해 보는 걸 막는다. 로그인은 Vercel 서버를 거쳐 와서 IP로는 사람을 가를 수 없으니,
		// 최근 실패 횟수를 전체로 센다. 15분 안에 10번 틀리면 15분 동안 아무도 로그인하지 못한다(관리자 한 명이라 감수한다)
		synchronized(failures) {
			val since = Instant.now().minus(FAIL_WINDOW)
			while (failures.isNotEmpty() && failures.peekFirst().isBefore(since)) failures.pollFirst()
			if (failures.size >= MAX_FAILURES) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)
		}
		val ok = props.adminPassword.isNotBlank() &&
			MessageDigest.isEqual(id.toByteArray(), props.adminId.toByteArray()) and
			MessageDigest.isEqual(password.toByteArray(), props.adminPassword.toByteArray())
		if (!ok) {
			// 비밀번호를 빠르게 대입해 보는 걸 늦춘다
			synchronized(failures) { failures.addLast(Instant.now()) }
			Thread.sleep(FAIL_DELAY.toMillis())
			return null
		}
		val token = ByteArray(32).also(random::nextBytes).joinToString("") { "%02x".format(it) }
		sessions[token] = Instant.now().plus(TTL)
		return token
	}

	fun logout(authorization: String?) {
		tokenOf(authorization)?.let(sessions::remove)
	}

	fun isValid(authorization: String?): Boolean {
		val token = tokenOf(authorization) ?: return false
		val expires = sessions[token] ?: return false
		if (expires.isBefore(Instant.now())) {
			sessions.remove(token)
			return false
		}
		return true
	}

	fun require(authorization: String?) {
		if (!isValid(authorization)) throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
	}

	private fun tokenOf(authorization: String?) = authorization?.removePrefix("Bearer ")?.trim()?.ifBlank { null }

	companion object {
		private val TTL = Duration.ofDays(7)
		private val FAIL_DELAY = Duration.ofMillis(400)
		private val FAIL_WINDOW = Duration.ofMinutes(15)
		private const val MAX_FAILURES = 10
	}
}
