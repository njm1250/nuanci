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
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.util.UUID
import kotlin.test.assertEquals

@SpringBootTest(properties = ["nuanci.admin-password=$TEST_ADMIN_PASSWORD"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@Transactional
class TypeTestApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var mapper: JsonMapper
	@Autowired lateinit var store: SceneStore

	@BeforeEach
	fun seed() = store.loadFixtures(mapper)

	private fun send(type: String, visitor: UUID, vararg extra: Pair<String, String>) = mvc.post("/api/events") {
		contentType = MediaType.APPLICATION_JSON
		content = mapper.writeValueAsString(mapOf("type" to type, "visitorId" to visitor.toString()) + extra)
	}

	@Test
	fun `유형별로 결과를 받은 사람 수를 세고, 같은 사람이 여러 번 받아도 한 번만 센다`() {
		val a = UUID.randomUUID()
		val b = UUID.randomUUID()
		send("test_completed", a, "choiceId" to "literal")
		send("test_completed", a, "choiceId" to "literal")
		send("test_completed", b, "choiceId" to "pudding")
		mvc.get("/api/test/types").andExpect {
			status { isOk() }
			jsonPath("$.total") { value(2) }
			jsonPath("$.types.literal") { value(1) }
			jsonPath("$.types.pudding") { value(1) }
		}
	}

	@Test
	fun `관리자 지표에 테스트 단계별 인원과 친구 링크 유입을 보여준다`() {
		val me = UUID.randomUUID()
		val friend = UUID.randomUUID()
		send("test_viewed", me)
		send("test_started", me)
		send("test_completed", me, "choiceId" to "boss")
		send("test_shared", me, "choiceId" to "boss")
		send("test_result_viewed", friend, "choiceId" to "boss", "entry" to "share")
		send("test_started", friend, "entry" to "share")

		val body = mapper.readTree(mvc.get("/api/admin/metrics") { header("Authorization", "Bearer ${mvc.adminToken()}") }.andReturn().response.contentAsString)
		val test = body.path("test")
		assertEquals(listOf(1, 2, 1, 1, 1, 1), listOf("viewed", "started", "completed", "shared", "friendViewed", "fromFriend").map { test.path(it).asInt() })
		assertEquals(1, test.path("types").path("boss").asInt())
		// 테스트 이벤트는 장면 퍼널에 섞이지 않는다
		assertEquals(0, body.path("funnel").path("started").asInt())
	}

	@Test
	fun `처음 들어온 채널로 방문자를 나누고, 나중에 다른 링크로 와도 처음 채널을 유지한다`() {
		val a = UUID.randomUUID()
		val b = UUID.randomUUID()
		send("test_started", a, "utmSource" to "Threads")
		send("test_completed", a, "utmSource" to "instagram", "choiceId" to "boss")
		send("test_started", b, "referrer" to "everytime.kr")
		send("test_started", UUID.randomUUID())

		val body = mapper.readTree(mvc.get("/api/admin/metrics") { header("Authorization", "Bearer ${mvc.adminToken()}") }.andReturn().response.contentAsString)
		val sources = body.path("sources").associate { (if (it.path("channel").isNull) null else it.path("channel").asString()) to it }
		assertEquals(setOf("threads", "everytime.kr", null), sources.keys)
		assertEquals(1, sources["threads"]!!.path("testCompleted").asInt())
		assertEquals(1, sources[null]!!.path("visitors").asInt())
	}
}
