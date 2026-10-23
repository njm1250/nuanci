package com.nuanci.api

import com.nuanci.TestcontainersConfiguration
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.util.UUID
import kotlin.test.assertEquals

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@Transactional
class SceneApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var mapper: JsonMapper

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
			jsonPath("$.length()") { value(2) }
			jsonPath("$[0].id") { value("eat-a-lot") }
		}
		mvc.get("/api/scenes/file-request").andExpect {
			status { isOk() }
			jsonPath("$.version") { value(1) }
			jsonPath("$.base.choices.length()") { value(3) }
		}
		mvc.get("/api/scenes/nope").andExpect { status { isNotFound() } }
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
		send(event("choice_selected", a, step = "followUp", choiceId = "plenty-more"))
		send(event("scene_completed", a))
		send(event("share_link_copied", a))
		send(event("scene_viewed", b, entry = "next"))

		val body = mvc.get("/api/admin/metrics").andExpect { status { isOk() } }.andReturn().response.contentAsString
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

	companion object {
		private val VISITOR = UUID.randomUUID()
	}
}
