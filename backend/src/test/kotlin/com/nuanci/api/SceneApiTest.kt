package com.nuanci.api

import com.nuanci.TEST_ADMIN_PASSWORD
import com.nuanci.TestcontainersConfiguration
import com.nuanci.adminToken
import com.nuanci.loadFixtures
import com.nuanci.scene.SceneStore
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@SpringBootTest(properties = ["nuanci.admin-password=$TEST_ADMIN_PASSWORD"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@Transactional
class SceneApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var mapper: JsonMapper
	@Autowired lateinit var store: SceneStore

	@BeforeEach
	fun seed() = store.loadFixtures(mapper)

	private fun event(type: String, attempt: UUID, step: String? = null, choiceId: String? = null, entry: String? = null) =
		mapOf(
			"type" to type,
			"sceneId" to "eat-a-lot",
			"sceneVersion" to 1,
			"attemptId" to attempt.toString(),
			"visitorId" to VISITOR.toString(),
			"step" to step,
			"choiceId" to choiceId,
			"entry" to entry,
		)

	private fun send(body: Any) = mvc.post("/api/events") {
		contentType = MediaType.APPLICATION_JSON
		content = mapper.writeValueAsString(body)
	}

	@Test
	fun `공개된 장면 목록과 장면 내용을 버전과 함께 준다`() {
		mvc.get("/api/scenes").andExpect {
			status { isOk() }
			jsonPath("$.length()") { value(8) }
			jsonPath("$[0].id") { value("pudding") }
		}
		mvc.get("/api/scenes/file-request").andExpect {
			status { isOk() }
			jsonPath("$.version") { value(1) }
			jsonPath("$.base.choices.length()") { value(3) }
		}
		mvc.get("/api/scenes/nope").andExpect { status { isNotFound() } }
	}

	@Test
	fun `초안은 공개 API에 나오지 않고 검수 API에서만 보인다`() {
		val token = mvc.adminToken()
		mvc.patch("/api/admin/scenes/touch-grass/status") {
			header("Authorization", "Bearer $token")
			contentType = MediaType.APPLICATION_JSON
			content = """{"status":"draft"}"""
		}.andExpect { status { isNoContent() } }
		mvc.get("/api/scenes/touch-grass").andExpect { status { isNotFound() } }

		val body = mvc.get("/api/admin/scenes") { header("Authorization", "Bearer $token") }.andExpect { status { isOk() } }.andReturn().response.contentAsString
		val list = mapper.readTree(body).toList()
		assertEquals("touch-grass", list.first().path("id").asString())
		assertEquals("draft", list.first().path("status").asString())
		assertEquals(0, list.first().path("warnings").size())
		assertTrue(list.all { it.path("warnings").isEmpty })

		mvc.get("/api/admin/scenes/touch-grass") { header("Authorization", "Bearer $token") }.andExpect {
			status { isOk() }
			jsonPath("$.base.choices[0].verdict") { value("bad") }
			jsonPath("$.base.choices[0].trap") { value("literal") }
		}
	}

	@Test
	fun `잘못된 이벤트는 받지 않는다`() {
		send(event("clicked_somewhere", UUID.randomUUID())).andExpect { status { isBadRequest() } }
		send(event("scene_viewed", UUID.randomUUID()) + ("sceneId" to "nope")).andExpect { status { isBadRequest() } }
	}

	@Test
	fun `이벤트가 시도 기준 지표로 집계된다`() {
		val a = UUID.randomUUID()
		val b = UUID.randomUUID()
		send(event("scene_viewed", a, entry = "home")).andExpect { status { isAccepted() } }
		send(event("choice_selected", a, step = "base", choiceId = "eat-a-lot")).andExpect { status { isAccepted() } }
		send(event("alternative_viewed", a, step = "base", choiceId = "help-yourself"))
		send(event("choice_selected", a, step = "followUp", choiceId = "room-for-dessert"))
		send(event("scene_completed", a))
		send(event("share_link_copied", a))
		send(event("scene_viewed", b, entry = "next"))

		val body = mvc.get("/api/admin/metrics") { header("Authorization", "Bearer ${mvc.adminToken()}") }.andExpect { status { isOk() } }.andReturn().response.contentAsString
		val scene = mapper.readTree(body).path("scenes").first { it.path("id").asString() == "eat-a-lot" }

		assertEquals(2, scene.path("viewed").asInt())
		assertEquals(1, scene.path("baseChosen").asInt())
		assertEquals(1, scene.path("followUpChosen").asInt())
		assertEquals(1, scene.path("completed").asInt())
		assertEquals(1, scene.path("alternativesViewed").asInt())
		assertEquals(1, scene.path("shared").asInt())
		assertEquals(1, scene.path("fromNext").asInt())
		assertEquals(2, scene.path("choices").size())
	}

	@Test
	fun `관리자 기기로 등록한 방문자의 이벤트는 지표에서 뺀다`() {
		val token = mvc.adminToken()
		val me = UUID.randomUUID()
		send(event("scene_viewed", UUID.randomUUID(), entry = "home"))
		send(event("scene_viewed", UUID.randomUUID(), entry = "home") + ("visitorId" to me.toString()))
		mvc.post("/api/admin/metrics/internal-visitors") {
			header("Authorization", "Bearer $token")
			contentType = MediaType.APPLICATION_JSON
			content = """{"visitorId":"$me"}"""
		}.andExpect { status { isNoContent() } }

		val body = mapper.readTree(mvc.get("/api/admin/metrics") { header("Authorization", "Bearer $token") }.andReturn().response.contentAsString)
		assertEquals(1, body.path("visitors").asInt())
		assertEquals(1, body.path("internalVisitors").asInt())
		assertEquals(1, body.path("internalEvents").asInt())
		assertEquals(1, body.path("scenes").first { it.path("id").asString() == "eat-a-lot" }.path("viewed").asInt())
	}

	companion object {
		private val VISITOR = UUID.randomUUID()
	}
}
