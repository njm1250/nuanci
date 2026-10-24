package com.nuanci.scene

import com.nuanci.admin.AdminSessions
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.JsonNode
import tools.jackson.databind.node.ObjectNode
import java.time.Instant

data class AdminScene(
	val id: String,
	val number: Int,
	val title: String,
	val status: String,
	val version: Int,
	val updatedAt: Instant,
	val warnings: List<String>,
)

data class StatusRequest(val status: String = "")

data class ErrorResponse(val message: String)

// 공개 상태와 상관없이 모든 장면을 보고, JSON으로 새 장면을 넣거나 고치고, 공개 상태를 바꾼다
@RestController
@RequestMapping("/api/admin/scenes")
class SceneAdminController(
	private val store: SceneStore,
	private val scenes: SceneRepository,
	private val sessions: AdminSessions,
) {
	@GetMapping
	fun list(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): List<AdminScene> {
		sessions.require(auth)
		return scenes.findAll().sortedWith(compareBy({ STATUS_ORDER.indexOf(it.status) }, { it.sortOrder })).map {
			AdminScene(it.id, it.number, it.title, it.status, it.currentVersion, it.updatedAt, SceneCheck.warnings(store.content(it)))
		}
	}

	@GetMapping("/mix")
	fun mix(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): SceneMix {
		sessions.require(auth)
		return SceneCheck.mix(scenes.findAll().filter { it.status != SceneStatus.HIDDEN }.map { store.content(it) })
	}

	@GetMapping("/{id}")
	fun get(@PathVariable id: String, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): ObjectNode {
		sessions.require(auth)
		return store.content(scenes.findById(id).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) })
	}

	@PutMapping("/{id}")
	fun put(
		@PathVariable id: String,
		@RequestParam(defaultValue = "false") dryRun: Boolean,
		@RequestBody body: JsonNode,
		@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?,
	): SaveResult {
		sessions.require(auth)
		require(body.path("id").asString("") == id) { "JSON의 id가 주소의 id(${id})와 달라요" }
		return store.save(body, dryRun)
	}

	@PatchMapping("/{id}/status")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun status(@PathVariable id: String, @RequestBody req: StatusRequest, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) {
		sessions.require(auth)
		if (!scenes.existsById(id)) throw ResponseStatusException(HttpStatus.NOT_FOUND)
		store.setStatus(id, req.status)
	}

	@ExceptionHandler(IllegalArgumentException::class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	fun invalid(e: IllegalArgumentException) = ErrorResponse(e.message ?: "잘못된 장면이에요")

	companion object {
		private val STATUS_ORDER = listOf(SceneStatus.DRAFT, SceneStatus.PUBLISHED, SceneStatus.HIDDEN)
	}
}
