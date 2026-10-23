package com.nuanci.admin

import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

data class LoginRequest(val id: String = "", val password: String = "")

data class LoginResponse(val token: String)

@RestController
@RequestMapping("/api/admin")
class AdminAuthController(private val sessions: AdminSessions) {
	@PostMapping("/login")
	fun login(@RequestBody req: LoginRequest): LoginResponse =
		LoginResponse(sessions.login(req.id, req.password) ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED))

	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun logout(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) = sessions.logout(auth)

	@GetMapping("/session")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun session(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) = sessions.require(auth)
}
