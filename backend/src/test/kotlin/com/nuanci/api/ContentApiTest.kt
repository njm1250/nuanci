package com.nuanci.api

import com.nuanci.CONTENT_DIR
import com.nuanci.TestcontainersConfiguration
import com.nuanci.loadFixtures
import com.nuanci.scene.SceneCatalog
import com.nuanci.scene.SceneStatus
import com.nuanci.scene.SceneStore
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import jakarta.persistence.EntityManager
import jakarta.persistence.EntityManagerFactory
import org.hibernate.SessionFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.simple.JdbcClient
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
import kotlin.test.assertTrue

@SpringBootTest(properties = ["spring.jpa.properties.hibernate.generate_statistics=true"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@Transactional
class ContentApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var store: SceneStore
	@Autowired lateinit var mapper: JsonMapper
	@Autowired lateinit var catalog: SceneCatalog
	@Autowired lateinit var jdbc: JdbcClient
	@Autowired lateinit var em: EntityManager
	@Autowired lateinit var emf: EntityManagerFactory

	@BeforeEach
	fun seed() {
		catalog.forget()
		store.loadFixtures(mapper)
	}

	private fun json(url: String): JsonNode = mapper.readTree(mvc.get(url).andReturn().response.contentAsString)

	private fun current(): String = json("/api/content/current").path("manifest").asString()

	private fun hashes(manifest: String): Map<String, String> =
		json("/api/content/manifests/$manifest").path("scenes").associate { it.path("id").asString() to it.path("hash").asString() }

	private fun edit(id: String, note: String) {
		val scene = mapper.readTree(Files.readString(CONTENT_DIR.resolve("$id.json"))) as ObjectNode
		store.save(scene.put("discovery", "${scene.path("discovery").asString()} $note"))
	}

	@Test
	fun `목차를 다시 만들 때 장면 수와 상관없이 DB 조회는 두 번이다`() {
		edit("pudding", "쿼리 수 확인.")
		em.flush()
		em.clear()
		val stats = emf.unwrap(SessionFactory::class.java).statistics.also { it.clear() }
		catalog.current()
		// 공개 장면 목록 1번, 현재 버전 본문 1번. 장면마다 따로 조회하면 이 숫자가 장면 수만큼 늘어난다
		assertEquals(2, stats.prepareStatementCount)
	}

	@Test
	fun `장면 하나를 고치면 그 장면의 주소와 목차만 바뀌고, 이전 목차와 본문도 계속 읽힌다`() {
		val before = current()
		val old = hashes(before)
		mvc.get("/api/content/objects/${old.getValue("pudding")}").andExpect {
			status { isOk() }
			header { string("Cache-Control", "max-age=31536000, public, immutable") }
		}

		edit("pudding", "다시 확인했어요.")

		val after = current()
		val new = hashes(after)
		assertNotEquals(before, after)
		assertEquals(old.keys, new.keys)
		assertEquals(setOf("pudding"), old.keys.filter { old[it] != new[it] }.toSet())
		// 예전 목차를 받은 사람이 그 안의 주소를 따라가도 끊기지 않는다
		mvc.get("/api/content/manifests/$before").andExpect { status { isOk() } }
		mvc.get("/api/content/objects/${old.getValue("pudding")}").andExpect { status { isOk() } }
	}

	@Test
	fun `목록에서 뺀 장면은 목차에서 사라지지만, 한 번도 공개하지 않은 장면은 아예 남지 않는다`() {
		val hash = hashes(current()).getValue("pudding")
		store.setStatus("pudding", SceneStatus.HIDDEN)
		assertEquals(null, hashes(current())["pudding"])
		// 이미 공개한 주소는 캐시에서도 회수할 수 없으므로, 원본도 같은 내용을 계속 준다
		mvc.get("/api/content/objects/$hash").andExpect { status { isOk() } }

		val draft = mapper.readTree(Files.readString(CONTENT_DIR.resolve("pudding.json"))) as ObjectNode
		store.save(draft.put("id", "never-published").put("number", 9999).put("status", SceneStatus.DRAFT))
		current()
		val leaked = jdbc.sql("select count(*) from published_content where content like '%never-published%'").query(Int::class.java).single()
		assertEquals(0, leaked)
		assertTrue(hashes(current()).keys.none { it == "never-published" })
	}

	@Test
	fun `화면별 데이터는 장면 본문 없이 표현 한 쌍씩만 담고, 결과가 그대로면 주소도 그대로다`() {
		val manifest = json("/api/content/manifests/${current()}")
		val book = json("/api/content/views/${manifest.path("views").path("book").asString()}")
		val pudding = book.first { it.path("id").asString() == "pudding" }
		val pair = pudding.path("pairs")[0]
		assertEquals("good", json("/api/content/objects/${hashes(current()).getValue("pudding")}").path("base").path("choices").first { it.path("line").asString() == pair.path("right").asString() }.path("verdict").asString())
		assertTrue(pudding.path("pairs")[0].path("wrong").asString().isNotBlank())
		// 표현 모음에 나오지 않는 내용(다른 장면의 엔딩 등)만 바꾸면 표현 모음 주소는 그대로다
		val before = manifest.path("views").path("book").asString()
		val scene = mapper.readTree(Files.readString(CONTENT_DIR.resolve("pudding.json"))) as ObjectNode
		store.save(scene.put("discovery", "${scene.path("discovery").asString()} 바뀜."))
		assertEquals(before, json("/api/content/manifests/${current()}").path("views").path("book").asString())
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
