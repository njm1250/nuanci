package com.nuanci.account

import com.nuanci.config.NuanciProperties
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.security.SecureRandom
import java.time.Duration
import java.util.Base64

data class Providers(val google: Boolean)

const val SESSION_COOKIE = "nuanci_session"
private const val STATE_COOKIE = "nuanci_oauth"

// 구글 로그인 시작과 콜백, 로그아웃. FE가 /api를 같은 주소로 프록시하므로 쿠키는 사이트 주소에 붙는다
@RestController
@RequestMapping("/api/auth")
class AuthController(
	private val props: NuanciProperties,
	private val google: GoogleClient,
	private val accounts: AccountStore,
) {
	private val random = SecureRandom()
	private val secure get() = props.siteUrl.startsWith("https")

	@GetMapping("/providers")
	fun providers() = Providers(google = props.googleClientId.isNotBlank())

	@GetMapping("/google")
	fun start(@RequestParam(defaultValue = "/") next: String, response: HttpServletResponse) {
		if (props.googleClientId.isBlank()) throw ResponseStatusException(HttpStatus.NOT_FOUND)
		val state = Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(24).also(random::nextBytes))
		response.addHeader(HttpHeaders.SET_COOKIE, cookie(STATE_COOKIE, "$state|${safeNext(next)}", Duration.ofMinutes(10), "/api/auth").toString())
		response.sendRedirect(google.authorizeUrl(state))
	}

	@GetMapping("/google/callback")
	fun callback(
		@RequestParam(required = false) code: String?,
		@RequestParam(required = false) state: String?,
		@CookieValue(STATE_COOKIE, required = false) saved: String?,
		response: HttpServletResponse,
	) {
		response.addHeader(HttpHeaders.SET_COOKIE, cookie(STATE_COOKIE, "", Duration.ZERO, "/api/auth").toString())
		val (expected, next) = saved?.split("|", limit = 2)?.takeIf { it.size == 2 } ?: listOf("", "/")
		// 다른 사이트가 콜백을 흉내 내지 못하게 시작할 때 쿠키에 둔 state와 맞는지 본다
		if (code.isNullOrBlank() || state.isNullOrBlank() || state != expected) {
			response.sendRedirect("${props.siteUrl}/me?login=failed")
			return
		}
		val userId = accounts.upsertGoogle(google.profile(code))
		response.addHeader(HttpHeaders.SET_COOKIE, cookie(SESSION_COOKIE, accounts.createSession(userId), AccountStore.SESSION_TTL, "/").toString())
		response.sendRedirect("${props.siteUrl}$next${if ("?" in next) "&" else "?"}login=1")
	}

	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun logout(@CookieValue(SESSION_COOKIE, required = false) token: String?, response: HttpServletResponse) {
		accounts.deleteSession(token)
		response.addHeader(HttpHeaders.SET_COOKIE, cookie(SESSION_COOKIE, "", Duration.ZERO, "/").toString())
	}

	private fun cookie(name: String, value: String, maxAge: Duration, path: String) =
		ResponseCookie.from(name, value).httpOnly(true).secure(secure).sameSite("Lax").path(path).maxAge(maxAge).build()

	// 로그인 뒤 돌아갈 곳은 우리 사이트 안의 경로만 허용한다
	private fun safeNext(next: String) = if (next.startsWith("/") && !next.startsWith("//") && !next.contains("\\")) next else "/"
}
