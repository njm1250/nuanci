package com.nuanci.scene

import org.springframework.stereotype.Service
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicReference

data class CatalogEntry(
	val id: String,
	val number: Int,
	val title: String,
	val version: Int,
	val relation: String,
	val place: String,
	val category: String?,
	val stage: JsonNode?,
	val hash: String,
)

// 공개 장면 묶음 하나. 목차(manifest)와 장면 본문(objects)을 모두 내용 해시로 부른다
class Catalog(val hash: String, val manifest: String, val objects: Map<String, String>)

// 공개 장면을 해시 주소로 내보낸다. 내용이 같으면 주소도 같아서, 받는 쪽은 한 번 받은 목차와 장면을 영원히 캐시해도 된다.
// 무엇이 지금 목차인지는 current 하나만 짧게 묻는다. 목차는 공개 장면의 (id, 버전, 번호) 목록이 바뀔 때만 다시 만든다
@Service
class SceneCatalog(
	private val scenes: SceneRepository,
	private val versions: SceneVersionRepository,
	private val store: SceneStore,
	private val mapper: JsonMapper,
) {
	private val cached = AtomicReference<Pair<String, Catalog>?>(null)

	fun current(): Catalog {
		val published = scenes.findAllByStatusOrderBySortOrder(SceneStatus.PUBLISHED)
		val fingerprint = published.joinToString(",") { "${it.id}:${it.currentVersion}:${it.number}" }
		cached.get()?.let { (key, catalog) -> if (key == fingerprint) return catalog }
		return build(published).also { cached.set(fingerprint to it) }
	}

	private fun build(published: List<Scene>): Catalog {
		val byId = versions.findAllById(published.map { SceneVersionId(it.id, it.currentVersion) }).associateBy { it.sceneId }
		val objects = linkedMapOf<String, String>()
		val entries = published.map { scene ->
			val content = store.read(byId.getValue(scene.id))
			// 저장할 때의 해시가 아니라 내보내는 그대로의 해시를 쓴다. 읽을 때 형식을 바꿔 주는 코드가 달라져도 주소와 내용이 어긋나지 않는다
			val json = mapper.writeValueAsString(content)
			val hash = sha256(json)
			objects[hash] = json
			CatalogEntry(
				id = scene.id,
				number = scene.number,
				title = scene.title,
				version = scene.currentVersion,
				relation = content.path("relation").asString(""),
				place = content.path("place").asString(""),
				category = content.path("category").asString(null),
				stage = content.path("base").path("stage").takeUnless { it.isMissingNode },
				hash = hash,
			)
		}
		val manifest = mapper.writeValueAsString(mapOf("scenes" to entries))
		return Catalog(sha256(manifest), manifest, objects)
	}

	private fun sha256(text: String): String =
		MessageDigest.getInstance("SHA-256").digest(text.toByteArray()).joinToString("") { "%02x".format(it) }
}
