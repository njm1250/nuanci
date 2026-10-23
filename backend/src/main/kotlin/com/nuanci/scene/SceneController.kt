package com.nuanci.scene

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.json.JsonMapper
import tools.jackson.databind.node.ObjectNode

data class SceneSummary(val id: String, val number: Int, val title: String, val version: Int)

@RestController
@RequestMapping("/api/scenes")
class SceneController(
	private val scenes: SceneRepository,
	private val versions: SceneVersionRepository,
	private val mapper: JsonMapper,
) {
	@GetMapping
	fun list(): List<SceneSummary> =
		scenes.findAllByStatusOrderBySortOrder(SceneStatus.PUBLISHED).map { SceneSummary(it.id, it.number, it.title, it.currentVersion) }

	@GetMapping("/{id}")
	fun get(@PathVariable id: String): ObjectNode {
		val scene = scenes.findById(id).orElse(null)?.takeIf { it.status == SceneStatus.PUBLISHED }
			?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
		val version = versions.findById(SceneVersionId(id, scene.currentVersion)).orElseThrow()
		return (mapper.readTree(version.content) as ObjectNode).put("version", version.version)
	}
}
