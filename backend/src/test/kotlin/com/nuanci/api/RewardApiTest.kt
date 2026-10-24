package com.nuanci.api

import com.nuanci.TestcontainersConfiguration
import com.nuanci.loadFixtures
import com.nuanci.scene.SceneStore
import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.util.UUID

@SpringBootTest(properties = ["nuanci.google-client-id=test-client", "nuanci.site-url=https://nuanci.test"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class, AccountApiTest.FakeGoogle::class)
@Transactional
class RewardApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var store: SceneStore
	@Autowired lateinit var mapper: JsonMapper
	@Autowired lateinit var rewards: com.nuanci.reward.RewardStore

	@BeforeEach
	fun seed() = store.loadFixtures(mapper)

	private fun clear(visitor: UUID, sceneId: String, via: String? = null, session: Cookie? = null): ResultActionsDsl =
		mvc.post("/api/rewards/clear") {
			session?.let { cookie(it) }
			contentType = MediaType.APPLICATION_JSON
			content = mapper.writeValueAsString(mapOf("visitorId" to visitor, "sceneId" to sceneId, "via" to via))
		}

	private fun sync(visitor: UUID, cleared: List<String>, session: Cookie? = null): ResultActionsDsl =
		mvc.post("/api/rewards/sync") {
			session?.let { cookie(it) }
			contentType = MediaType.APPLICATION_JSON
			content = mapper.writeValueAsString(mapOf("visitorId" to visitor, "cleared" to cleared))
		}

	private fun item(id: String) = "$.items[?(@.id == '$id')]"

	@Test
	fun `첫 장면을 끝내면 바로 첫 보상을 주고 같은 보상은 다시 주지 않는다`() {
		val visitor = UUID.randomUUID()
		clear(visitor, "my-treat").andExpect {
			status { isOk() }
			jsonPath("$.granted[0]") { value("cap") }
			jsonPath("${item("cap")}.owned.color") { value("red") }
			jsonPath("${item("plant")}.name") { value(null as Any?) }
			jsonPath("${item("plant")}.lock.remaining") { value(4) }
			jsonPath("$.next.name") { value("화분") }
			jsonPath("$.shareCode") { exists() }
		}
		clear(visitor, "my-treat").andExpect { jsonPath("$.granted.length()") { value(0) } }
		// 장면 기념품은 그 장면을 끝냈을 때 준다
		clear(visitor, "pudding").andExpect { jsonPath("$.granted[0]") { value("pudding") } }
	}

	@Test
	fun `예전 기기 기록으로 받을 보상을 채운다`() {
		val visitor = UUID.randomUUID()
		val all = listOf("did-you-eat", "eat-a-lot", "file-request", "first-upload", "get-home-safe", "my-treat", "pudding", "touch-grass")
		sync(visitor, all).andExpect {
			status { isOk() }
			jsonPath("${item("plant")}.owned.reason") { value("milestone") }
			jsonPath("${item("glasses")}.owned") { value(null as Any?) }
			jsonPath("$.next.name") { value("동그란 안경") }
		}
	}

	@Test
	fun `깜짝 상자는 없는 물건만 준다`() {
		val visitor = UUID.randomUUID()
		val granted = rewards.evaluate(visitor, (1..25).map { "s$it" }, "sync")
		val boxes = granted.filter { it.reason == "box" }
		kotlin.test.assertEquals(2, boxes.size)
		kotlin.test.assertEquals(2, boxes.map { it.rewardId }.distinct().size)
	}

	@Test
	fun `동시에 동기화해도 깜짝 상자를 더 주지 않는다`() {
		val visitor = UUID.randomUUID()
		val all = (1..12).map { "s$it" }
		val pool = java.util.concurrent.Executors.newFixedThreadPool(4)
		(1..4).map { pool.submit { rewards.evaluate(visitor, all, "sync") } }.forEach { it.get() }
		pool.shutdown()
		kotlin.test.assertEquals(1, rewards.grants(visitor).count { it.reason == "box" })
	}

	@Test
	fun `친구가 공유 링크로 장면을 끝내면 둘 다 기념품을 받는다`() {
		val sharer = UUID.randomUUID()
		val code = mapper.readTree(clear(sharer, "my-treat").andReturn().response.contentAsString)["shareCode"].asString()
		// 자기 링크로는 받지 않는다
		clear(sharer, "pudding", via = code).andExpect { jsonPath("$.granted[?(@ == 'frame')]") { isEmpty() } }
		clear(UUID.randomUUID(), "my-treat", via = code).andExpect { jsonPath("$.granted[?(@ == 'frame')]") { isNotEmpty() } }
		sync(sharer, emptyList()).andExpect { jsonPath("${item("frame")}.owned.reason") { value("share") } }
	}

	@Test
	fun `색은 고를 수 있는 것만 바꾼다`() {
		val visitor = UUID.randomUUID()
		clear(visitor, "my-treat")
		mvc.put("/api/rewards/cap/color") {
			contentType = MediaType.APPLICATION_JSON
			content = """{"visitorId":"$visitor","color":"blue"}"""
		}.andExpect { status { isNoContent() } }
		mvc.put("/api/rewards/cap/color") {
			contentType = MediaType.APPLICATION_JSON
			content = """{"visitorId":"$visitor","color":"pink"}"""
		}.andExpect { status { isBadRequest() } }
		sync(visitor, emptyList()).andExpect { jsonPath("${item("cap")}.owned.color") { value("blue") } }
	}

	@Test
	fun `로그인하면 방문자로 얻은 보상을 계정으로 옮긴다`() {
		val visitor = UUID.randomUUID()
		clear(visitor, "my-treat")
		val start = mvc.get("/api/auth/google?next=/").andReturn().response
		val state = start.redirectedUrl!!.substringAfter("state=")
		val session = mvc.get("/api/auth/google/callback?code=reward&state=$state") { cookie(start.getCookie("nuanci_oauth")!!) }
			.andReturn().response.getCookie("nuanci_session")!!
		sync(visitor, listOf("my-treat"), session).andExpect { jsonPath("${item("cap")}.owned") { exists() } }
		// 옮긴 뒤 방문자 몫은 비어 있다
		sync(visitor, emptyList()).andExpect { jsonPath("${item("cap")}.owned") { value(null as Any?) } }
	}
}
