package com.nuanci.api

import com.nuanci.CONTENT_DIR
import com.nuanci.TestcontainersConfiguration
import com.nuanci.loadFixtures
import com.nuanci.scene.SceneStatus
import com.nuanci.scene.SceneStore
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import tools.jackson.databind.node.ObjectNode
import java.nio.file.Files
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@Transactional
class ContentApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var store: SceneStore
	@Autowired lateinit var mapper: JsonMapper

	@BeforeEach
	fun seed() = store.loadFixtures(mapper)

	private fun json(url: String): JsonNode = mapper.readTree(mvc.get(url).andReturn().response.contentAsString)

	private fun current(): String = json("/api/content/current").path("manifest").asString()

	private fun hashes(manifest: String): Map<String, String> =
		json("/api/content/manifests/$manifest").path("scenes").associate { it.path("id").asString() to it.path("hash").asString() }

	@Test
	fun `장면 하나를 고치면 그 장면의 주소와 목차만 바뀌고 이전 목차는 더 이상 내보내지 않는다`() {
		val before = current()
		val old = hashes(before)
		mvc.get("/api/content/objects/${old.getValue("pudding")}").andExpect {
			status { isOk() }
			header { string("Cache-Control", "max-age=31536000, public, immutable") }
		}

		val pudding = mapper.readTree(Files.readString(CONTENT_DIR.resolve("pudding.json"))) as ObjectNode
		store.save(pudding.put("discovery", "${pudding.path("discovery").asString()} 다시 확인했어요."))

		val after = current()
		val new = hashes(after)
		assertNotEquals(before, after)
		assertEquals(old.keys, new.keys)
		assertEquals(setOf("pudding"), old.keys.filter { old[it] != new[it] }.toSet())
		mvc.get("/api/content/manifests/$before").andExpect { status { isNotFound() } }
	}

	@Test
	fun `공개하지 않은 장면은 목차에도 없고 주소로도 받을 수 없다`() {
		val hash = hashes(current()).getValue("pudding")
		store.setStatus("pudding", SceneStatus.DRAFT)

		assertEquals(null, hashes(current())["pudding"])
		mvc.get("/api/content/objects/$hash").andExpect { status { isNotFound() } }
	}

	@Test
	fun `목차가 그대로면 current는 본문 없이 304로 답한다`() {
		val etag = mvc.get("/api/content/current").andReturn().response.getHeader("ETag")
		mvc.get("/api/content/current") { header("If-None-Match", etag!!) }.andExpect {
			status { isNotModified() }
			header { string("Cache-Control", "no-cache") }
		}
	}
}
