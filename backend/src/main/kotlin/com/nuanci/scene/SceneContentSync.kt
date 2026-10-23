package com.nuanci.scene

import com.nuanci.config.NuanciProperties
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import java.time.Instant
import kotlin.io.path.extension
import kotlin.io.path.listDirectoryEntries
import kotlin.io.path.nameWithoutExtension

data class SyncResult(val created: List<String>, val updated: List<String>, val hidden: List<String>)

// 콘텐츠 폴더의 장면 JSON을 DB와 맞춘다. 내용이 바뀐 장면만 새 버전으로 쌓아서 예전 이벤트가 당시 버전을 가리키게 한다
@Service
class SceneContentSync(
	private val mapper: JsonMapper,
	private val scenes: SceneRepository,
	private val versions: SceneVersionRepository,
) {
	@Transactional
	fun sync(dir: Path): SyncResult {
		val files = dir.listDirectoryEntries().filter { it.extension == "json" }.sortedBy { it.fileName.toString() }
		val created = mutableListOf<String>()
		val updated = mutableListOf<String>()
		val seen = mutableSetOf<String>()
		val now = Instant.now()

		val nodes = files.map { it to mapper.readTree(Files.readString(it)) }
		checkNumbers(nodes)

		for ((file, node) in nodes) {
			val id = node.requireText("id", file)
			require(id == file.nameWithoutExtension) { "${file.fileName}: id(${id})와 파일 이름이 달라요" }
			listOf("base", "followUp", "discovery").forEach { require(node.has(it)) { "${file.fileName}: ${it}가 없어요" } }

			val json = mapper.writeValueAsString(node)
			val hash = sha256(json)
			val existing = scenes.findById(id).orElse(null)
			val latest = existing?.let { versions.findById(SceneVersionId(id, it.currentVersion)).orElse(null) }
			val changed = latest?.contentHash != hash
			val version = if (changed) (existing?.currentVersion ?: 0) + 1 else existing!!.currentVersion

			val scene = existing ?: Scene(id, 0, "", "", 0, version, now)
			scene.number = node.path("number").asInt()
			scene.title = node.requireText("title", file)
			scene.status = node.path("status").asString(SceneStatus.PUBLISHED)
			scene.sortOrder = node.path("order").asInt()
			scene.currentVersion = version
			scene.updatedAt = now
			scenes.saveAndFlush(scene)

			if (changed) {
				versions.save(SceneVersion(id, version, hash, json, now))
				if (existing == null) created += id else updated += id
			}
			seen += id
		}

		val hidden = scenes.findAll().filter { it.id !in seen && it.status != SceneStatus.HIDDEN }
		hidden.forEach {
			it.status = SceneStatus.HIDDEN
			it.updatedAt = now
		}
		return SyncResult(created, updated, hidden.map { it.id })
	}

	// 번호는 공개 주소에 쓰이므로 파일끼리 겹치거나, 숨겨진 장면이 쓰던 번호를 다시 쓰면 거부한다
	private fun checkNumbers(nodes: List<Pair<Path, JsonNode>>) {
		val owners = scenes.findAll().associate { it.number to it.id }
		val seen = mutableMapOf<Int, Path>()
		for ((file, node) in nodes) {
			val number = node.path("number").asInt(0)
			require(number > 0) { "${file.fileName}: number는 1 이상이어야 해요" }
			seen.put(number, file)?.let { throw IllegalArgumentException("${file.fileName}: number ${number}가 ${it.fileName}와 겹쳐요") }
			val owner = owners[number]
			require(owner == null || owner == file.nameWithoutExtension) { "${file.fileName}: number ${number}는 이미 장면 ${owner}가 쓰고 있어요" }
		}
	}

	private fun JsonNode.requireText(field: String, file: Path): String =
		path(field).asString("").ifBlank { throw IllegalArgumentException("${file.fileName}: ${field}가 비어 있어요") }

	private fun sha256(text: String): String =
		MessageDigest.getInstance("SHA-256").digest(text.toByteArray()).joinToString("") { "%02x".format(it) }
}

@Component
class SceneContentSyncRunner(
	private val sync: SceneContentSync,
	private val props: NuanciProperties,
) : ApplicationRunner {
	private val log = LoggerFactory.getLogger(javaClass)

	override fun run(args: ApplicationArguments) {
		val dir = Path.of(props.contentDir).toAbsolutePath().normalize()
		val result = sync.sync(dir)
		log.info("장면 콘텐츠 동기화 ({}): 새로 추가 {}, 새 버전 {}, 숨김 {}", dir, result.created, result.updated, result.hidden)
	}
}
