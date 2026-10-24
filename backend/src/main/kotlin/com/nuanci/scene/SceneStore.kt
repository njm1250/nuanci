package com.nuanci.scene

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import tools.jackson.databind.node.ObjectNode
import java.security.MessageDigest
import java.time.Instant

data class SaveResult(val id: String, val version: Int, val created: Boolean, val changed: Boolean, val warnings: List<String>)

// 장면 JSON을 검사해 DB에 저장한다. 내용이 바뀐 경우에만 새 버전을 쌓아서 예전 이벤트가 당시 버전을 가리키게 한다.
// 공개 상태는 DB 컬럼이 원본이라 저장하는 JSON에서는 뺀다
@Service
class SceneStore(
	private val mapper: JsonMapper,
	private val scenes: SceneRepository,
	private val versions: SceneVersionRepository,
) {
	@Transactional
	fun save(node: JsonNode, dryRun: Boolean = false): SaveResult {
		validate(node)
		val id = node.path("id").asString()
		val existing = scenes.findById(id).orElse(null)
		val stored = (node.deepCopy() as ObjectNode).also { it.remove("status") }
		val json = mapper.writeValueAsString(stored)
		val hash = sha256(json)
		val latest = existing?.let { latest(it) }
		val changed = latest?.contentHash != hash
		val version = if (changed) (existing?.currentVersion ?: 0) + 1 else existing!!.currentVersion
		val result = SaveResult(id, version, existing == null, changed, SceneCheck.warnings(node))
		if (dryRun) return result

		val now = Instant.now()
		val scene = existing ?: Scene(id, 0, "", node.path("status").asString(SceneStatus.DRAFT), 0, version, now)
		scene.number = node.path("number").asInt()
		scene.title = node.path("title").asString()
		scene.sortOrder = node.path("order").asInt()
		scene.currentVersion = version
		scene.updatedAt = now
		scenes.saveAndFlush(scene)
		if (changed) versions.save(SceneVersion(id, version, hash, json, now))
		return result
	}

	@Transactional
	fun setStatus(id: String, status: String) {
		require(status in SceneStatus.ALL) { "status는 ${SceneStatus.ALL} 중 하나여야 해요" }
		val scene = scenes.findById(id).orElseThrow { NoSuchElementException(id) }
		scene.status = status
		scene.updatedAt = Instant.now()
	}

	fun content(scene: Scene): ObjectNode = read(latest(scene)).put("status", scene.status)

	fun read(version: SceneVersion): ObjectNode = upgrade(mapper.readTree(version.content) as ObjectNode).put("version", version.version)

	fun latest(scene: Scene): SceneVersion = versions.findById(SceneVersionId(scene.id, scene.currentVersion)).orElseThrow()

	// 화면이 깨지거나 공개 주소가 겹치는 형식 오류는 저장 자체를 막는다
	fun validate(node: JsonNode) {
		require(node.isObject) { "JSON 객체여야 해요" }
		val id = node.path("id").asString("")
		require(ID.matches(id)) { "id는 영문 소문자, 숫자, -로만 써야 해요" }
		require(node.path("title").asString("").isNotBlank()) { "title이 비어 있어요" }
		listOf("base", "followUp", "discovery").forEach { require(node.has(it)) { "${it}가 없어요" } }
		for (step in listOf("base", "followUp")) {
			require(node.path(step).path("choices").isArray) { "${step}.choices가 없어요" }
			for (choice in node.path(step).path("choices")) {
				val name = "${step} 선택지 ${choice.path("id").asString("")}"
				val verdict = choice.path("verdict").asString("")
				val trap = choice.path("trap").asString("")
				require(verdict in SceneCheck.VERDICTS) { "${name}의 verdict는 ${SceneCheck.VERDICTS} 중 하나여야 해요" }
				if (verdict == "good") {
					require(trap.isEmpty()) { "${name}는 자연스러운 말이라 trap을 비워야 해요" }
				} else {
					require(trap in SceneCheck.TRAPS) { "${name}의 trap은 ${SceneCheck.TRAPS.keys} 중 하나여야 해요" }
				}
			}
		}
		if (node.has("hero")) require(node.path("hero").asString("") in HEROES) { "hero는 ${HEROES} 중 하나여야 해요" }
		if (node.has("status")) require(node.path("status").asString("") in SceneStatus.ALL) { "status는 ${SceneStatus.ALL} 중 하나여야 해요" }
		val number = node.path("number").asInt(0)
		require(number > 0) { "number는 1 이상이어야 해요" }
		val owner = scenes.findByNumber(number)?.id
		// 번호는 공개 주소라서 다른 장면이 쓰던 번호(숨긴 장면 포함)는 다시 쓰지 않는다
		require(owner == null || owner == id) { "number ${number}는 이미 장면 ${owner}가 쓰고 있어요" }
	}

	// 예전 버전은 선택지를 kind(literal/context/natural) 하나로 나눠 저장했다. 읽을 때 판정과 함정으로 바꿔 준다
	private fun upgrade(content: ObjectNode): ObjectNode {
		for (step in listOf("base", "followUp")) {
			for (choice in content.path(step).path("choices")) {
				if (choice !is ObjectNode || !choice.has("kind") || choice.has("verdict")) continue
				val kind = choice.remove("kind").asString("")
				choice.put("verdict", LEGACY_VERDICTS[kind] ?: "bad")
				if (kind != "natural") choice.put("trap", if (kind == "context") "context" else "literal")
			}
		}
		return content
	}

	private fun sha256(text: String): String =
		MessageDigest.getInstance("SHA-256").digest(text.toByteArray()).joinToString("") { "%02x".format(it) }

	companion object {
		private val ID = Regex("^[a-z0-9]+(-[a-z0-9]+)*$")
		private val HEROES = listOf("boy", "girl")
		private val LEGACY_VERDICTS = mapOf("natural" to "good", "context" to "meh", "literal" to "bad")
	}
}
