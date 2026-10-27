package com.nuanci.api

import com.nuanci.TEST_ADMIN_PASSWORD
import com.nuanci.TestcontainersConfiguration
import com.nuanci.account.AccountStore
import com.nuanci.account.GoogleProfile
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
import org.springframework.jdbc.core.simple.JdbcClient
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
class ReviewApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var mapper: JsonMapper
	@Autowired lateinit var store: SceneStore
	@Autowired lateinit var accounts: AccountStore
	@Autowired lateinit var jdbc: JdbcClient

	@BeforeEach
	fun seed() = store.loadFixtures(mapper)

	private fun pick(visitor: UUID, choiceId: String) = mvc.post("/api/events") {
		contentType = MediaType.APPLICATION_JSON
		content = mapper.writeValueAsString(
			mapOf("type" to "choice_selected", "sceneId" to "eat-a-lot", "sceneVersion" to 1, "attemptId" to UUID.randomUUID(), "visitorId" to visitor, "step" to "base", "choiceId" to choiceId),
		)
	}.andExpect { status { isAccepted() } }

	private fun today(visitor: UUID, session: Cookie? = null) =
		mapper.readTree(mvc.get("/api/review?visitorId=$visitor") { session?.let { cookie(it) } }.andReturn().response.contentAsString)

	private fun answer(visitor: UUID, id: Long, knew: Boolean) = mvc.post("/api/review/$id") {
		contentType = MediaType.APPLICATION_JSON
		content = mapper.writeValueAsString(mapOf("visitorId" to visitor, "knew" to knew))
	}

	// 다음에 물을 때가 된 것처럼 당겨 둔다
	private fun makeDue() = jdbc.sql("update review_card set due_at = now() - interval '1 minute'").update()

	@Test
	fun `첫 답이 오답이면 다음 날 묻고 알 때마다 간격을 늘려 세 번째에 익힌다`() {
		val visitor = UUID.randomUUID()
		pick(visitor, "eat-a-lot")
		pick(visitor, "help-yourself")
		val other = UUID.randomUUID()
		pick(other, "help-yourself")

		assertEquals(0, today(visitor).path("cards").size())
		assertEquals(0, jdbc.sql("select count(*) from review_card where owner_id = :o").param("o", other).query(Int::class.java).single())

		makeDue()
		val card = today(visitor).path("cards").first()
		assertEquals("Eat a lot!", card.path("mine").path("line").asString())
		assertEquals("Help yourself!", card.path("right").path("line").asString())
		val id = card.path("id").asLong()

		answer(other, id, true).andExpect { status { isNotFound() } }
		answer(visitor, id, true).andExpect { status { isNoContent() } }
		assertEquals(0, today(visitor).path("cards").size())
		repeat(2) {
			makeDue()
			answer(visitor, id, true).andExpect { status { isNoContent() } }
		}
		makeDue()
		val done = today(visitor)
		assertEquals(0, done.path("cards").size())
		assertEquals(1, done.path("mastered").asInt())
	}

	@Test
	fun `몰랐으면 처음 단계로 돌아가고 로그인하면 기기 카드를 계정으로 옮긴다`() {
		val visitor = UUID.randomUUID()
		pick(visitor, "enjoy-your-meal")
		makeDue()
		val id = today(visitor).path("cards").first().path("id").asLong()
		answer(visitor, id, false).andExpect { status { isNoContent() } }
		assertEquals(1, jdbc.sql("select box from review_card where id = :id").param("id", id).query(Int::class.java).single())

		val user = accounts.upsertGoogle(GoogleProfile("review-user", "review@example.com", "복습", null))
		val session = Cookie("nuanci_session", accounts.createSession(user))
		makeDue()
		assertEquals(1, today(visitor, session).path("cards").size())
		assertEquals(user, jdbc.sql("select owner_id from review_card where id <> 0 limit 1").query(UUID::class.java).single())
	}
}
