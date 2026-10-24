package com.nuanci.account

import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

data class Avatar(val hero: String = "boy", val accessory: String? = null)

data class MeResponse(val name: String?, val email: String?, val picture: String?, val cleared: List<String>, val avatar: Avatar?)

data class SyncRequest(val visitorId: UUID? = null, val cleared: List<String> = emptyList())

data class ClearedRequest(val sceneId: String = "")

// 로그인한 사용자의 정보와 끝낸 장면. 로그인하면 이 기기의 기록을 합쳐 계정에 남긴다
@RestController
@RequestMapping("/api/me")
class MeController(private val accounts: AccountStore) {
	@GetMapping
	fun me(@CookieValue(SESSION_COOKIE, required = false) token: String?): MeResponse {
		val account = require(token)
		return response(account)
	}

	// 이 기기에서 끝낸 장면을 계정에 합치고, 합친 결과를 돌려준다
	@PostMapping("/sync")
	fun sync(@CookieValue(SESSION_COOKIE, required = false) token: String?, @RequestBody req: SyncRequest): MeResponse {
		val account = require(token)
		accounts.addCleared(account.id, req.cleared)
		req.visitorId?.let { accounts.linkVisitor(account.id, it) }
		return response(account)
	}

	// 아지트에서 꾸민 모습을 저장한다. 어떤 아이템을 얻었는지는 아직 FE가 판단해서, 여기서는 값 형식만 본다
	@PutMapping("/avatar")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun avatar(@CookieValue(SESSION_COOKIE, required = false) token: String?, @RequestBody req: Avatar) {
		val account = require(token)
		if (req.hero !in HEROES || (req.accessory != null && !ITEM_ID.matches(req.accessory))) throw ResponseStatusException(HttpStatus.BAD_REQUEST)
		accounts.saveAvatar(account.id, req.hero, req.accessory)
	}

	@PostMapping("/cleared")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun cleared(@CookieValue(SESSION_COOKIE, required = false) token: String?, @RequestBody req: ClearedRequest) {
		accounts.addCleared(require(token).id, listOf(req.sceneId))
	}

	@DeleteMapping
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun delete(@CookieValue(SESSION_COOKIE, required = false) token: String?, response: HttpServletResponse) {
		accounts.delete(require(token).id)
		response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(SESSION_COOKIE, "").path("/").maxAge(0).build().toString())
	}

	private fun require(token: String?) = accounts.account(token) ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)

	private fun response(account: Account) =
		MeResponse(account.name, account.email, account.picture, accounts.cleared(account.id), account.hero?.let { Avatar(it, account.accessory) })

	companion object {
		private val HEROES = setOf("boy", "girl")
		private val ITEM_ID = Regex("^[a-z][a-z-]{0,39}$")
	}
}
