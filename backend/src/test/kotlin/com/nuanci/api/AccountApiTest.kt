package com.nuanci.api

import com.nuanci.TestcontainersConfiguration
import com.nuanci.account.GoogleClient
import com.nuanci.account.GoogleProfile
import com.nuanci.loadFixtures
import com.nuanci.scene.SceneStore
import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@SpringBootTest(properties = ["nuanci.google-client-id=test-client", "nuanci.site-url=https://nuanci.test"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class, AccountApiTest.FakeGoogle::class)
@Transactional
class AccountApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var store: SceneStore
	@Autowired lateinit var mapper: JsonMapper

	@TestConfiguration
	class FakeGoogle {
		@Bean
		@Primary
		fun google() = object : GoogleClient {
			override fun authorizeUrl(state: String) = "https://accounts.google.test/auth?state=$state"

			override fun profile(code: String) = GoogleProfile("sub-$code", "me@example.com", "나", null)
		}
	}

	@BeforeEach
	fun seed() = store.loadFixtures(mapper)

	// 로그인 시작 → 콜백까지 거쳐 세션 쿠키를 받는다
	private fun login(code: String = "abc"): Cookie {
		val start = mvc.get("/api/auth/google?next=/me").andExpect { status { is3xxRedirection() } }.andReturn().response
		val stateCookie = start.getCookie("nuanci_oauth")!!
		val state = start.redirectedUrl!!.substringAfter("state=")
		val callback = mvc.get("/api/auth/google/callback?code=$code&state=$state") { cookie(stateCookie) }
			.andExpect { status { is3xxRedirection() } }.andReturn().response
		assertEquals("https://nuanci.test/me?login=1", callback.redirectedUrl)
		val session = callback.getCookie("nuanci_session")!!
		assertTrue(session.isHttpOnly && session.secure)
		return session
	}

	@Test
	fun `구글로 로그인하면 이 기기의 기록을 계정에 합친다`() {
		val session = login()
		mvc.post("/api/me/sync") {
			cookie(session)
			contentType = MediaType.APPLICATION_JSON
			content = """{"visitorId":"${UUID.randomUUID()}","cleared":["pudding","my-treat","nope"]}"""
		}.andExpect {
			status { isOk() }
			jsonPath("$.name") { value("나") }
			jsonPath("$.cleared.length()") { value(2) }
		}
		mvc.post("/api/me/cleared") {
			cookie(session)
			contentType = MediaType.APPLICATION_JSON
			content = """{"sceneId":"touch-grass"}"""
		}.andExpect { status { isNoContent() } }
		mvc.get("/api/me") { cookie(session) }.andExpect { jsonPath("$.cleared.length()") { value(3) } }

		// 다시 로그인해도 같은 계정이다
		mvc.get("/api/me") { cookie(login()) }.andExpect { jsonPath("$.cleared.length()") { value(3) } }
	}

	@Test
	fun `꾸민 모습을 계정에 저장하고 잘못된 값은 막는다`() {
		val session = login()
		mvc.get("/api/me") { cookie(session) }.andExpect { jsonPath("$.avatar") { doesNotExist() } }
		// 첫 장면을 끝내면 모자를 얻는다. 얻지 않은 왕관은 쓸 수 없다
		mvc.post("/api/rewards/clear") {
			cookie(session)
			contentType = MediaType.APPLICATION_JSON
			content = """{"sceneId":"pudding"}"""
		}.andExpect { status { isOk() } }
		mvc.put("/api/me/avatar") {
			cookie(session)
			contentType = MediaType.APPLICATION_JSON
			content = """{"hero":"girl","accessory":"crown","placed":[]}"""
		}.andExpect { status { isForbidden() } }
		mvc.put("/api/me/avatar") {
			cookie(session)
			contentType = MediaType.APPLICATION_JSON
			content = """{"hero":"girl","wear":["cap"],"placed":[]}"""
		}.andExpect { status { isNoContent() } }
		mvc.get("/api/me") { cookie(session) }.andExpect {
			jsonPath("$.avatar.hero") { value("girl") }
			jsonPath("$.avatar.wear[0]") { value("cap") }
			jsonPath("$.avatar.placed.length()") { value(0) }
		}
		// 머리와 얼굴에는 하나씩 함께 쓸 수 있다
		mvc.post("/api/rewards/sync") {
			cookie(session)
			contentType = MediaType.APPLICATION_JSON
			content = """{"cleared":["pudding","my-treat","touch-grass","eat-a-lot","first-upload"]}"""
		}.andExpect { status { isOk() } }
		mvc.put("/api/me/avatar") {
			cookie(session)
			contentType = MediaType.APPLICATION_JSON
			content = """{"hero":"boy","wear":["cap","glasses"],"placed":["plant"]}"""
		}.andExpect { status { isNoContent() } }
		mvc.get("/api/me") { cookie(session) }.andExpect {
			jsonPath("$.avatar.wear.length()") { value(2) }
			jsonPath("$.avatar.placed[0]") { value("plant") }
		}
		// 얻지 않은 물건은 둘 수 없다
		mvc.put("/api/me/avatar") {
			cookie(session)
			contentType = MediaType.APPLICATION_JSON
			content = """{"hero":"boy","wear":[],"placed":["guitar"]}"""
		}.andExpect { status { isForbidden() } }
		mvc.put("/api/me/avatar") {
			cookie(session)
			contentType = MediaType.APPLICATION_JSON
			content = """{"hero":"cat","accessory":null}"""
		}.andExpect { status { isBadRequest() } }
	}

	@Test
	fun `state가 맞지 않거나 로그인하지 않으면 막는다`() {
		mvc.get("/api/auth/google/callback?code=abc&state=forged") { cookie(Cookie("nuanci_oauth", "real|/")) }
			.andExpect { redirectedUrl("https://nuanci.test/me?login=failed") }
		mvc.get("/api/me").andExpect { status { isUnauthorized() } }
		mvc.get("/api/auth/google?next=//evil.example").andReturn().response.getCookie("nuanci_oauth")!!.value.let { assertTrue(it.endsWith("|/")) }
	}

	@Test
	fun `로그아웃하거나 계정을 지우면 세션을 더 쓸 수 없다`() {
		val session = login()
		mvc.post("/api/auth/logout") { cookie(session) }.andExpect { status { isNoContent() } }
		mvc.get("/api/me") { cookie(session) }.andExpect { status { isUnauthorized() } }

		val again = login("other")
		mvc.delete("/api/me") { cookie(again) }.andExpect { status { isNoContent() } }
		mvc.get("/api/me") { cookie(again) }.andExpect { status { isUnauthorized() } }
		mvc.get("/api/auth/providers").andExpect { jsonPath("$.google") { value(true) } }
	}
}
