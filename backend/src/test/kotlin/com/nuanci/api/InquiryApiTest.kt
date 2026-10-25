package com.nuanci.api

import com.nuanci.TEST_ADMIN_PASSWORD
import com.nuanci.TestcontainersConfiguration
import com.nuanci.adminToken
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@SpringBootTest(properties = ["nuanci.admin-password=$TEST_ADMIN_PASSWORD"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@Transactional
class InquiryApiTest {
	@Autowired lateinit var mvc: MockMvc

	private fun send(body: String) = mvc.post("/api/inquiries") {
		contentType = MediaType.APPLICATION_JSON
		content = body
	}

	@Test
	fun `문의를 받아 두고 관리자가 보고 처리한다`() {
		val visitor = UUID.randomUUID()
		send("""{"kind":"scene","message":"'수고하세요'도 장면으로 만들어 주세요","contact":"me@example.com","page":"/scenes/7","visitorId":"$visitor"}""")
			.andExpect { status { isAccepted() } }
		val token = mvc.adminToken()
		val list = mvc.get("/api/admin/inquiries") { header("Authorization", "Bearer $token") }.andExpect {
			status { isOk() }
			jsonPath("$[0].kind") { value("scene") }
			jsonPath("$[0].contact") { value("me@example.com") }
			jsonPath("$[0].done") { value(false) }
		}.andReturn().response.contentAsString
		val id = Regex("\"id\":(\\d+)").find(list)!!.groupValues[1]
		mvc.put("/api/admin/inquiries/$id") {
			header("Authorization", "Bearer $token")
			contentType = MediaType.APPLICATION_JSON
			content = """{"done":true}"""
		}.andExpect { status { isNoContent() } }
		mvc.get("/api/admin/inquiries").andExpect { status { isUnauthorized() } }
	}

	@Test
	fun `종류가 이상하거나 너무 짧으면 막고, 한 방문자가 연달아 보내면 막는다`() {
		send("""{"kind":"spam","message":"hello"}""").andExpect { status { isBadRequest() } }
		send("""{"kind":"idea","message":" "}""").andExpect { status { isBadRequest() } }
		val visitor = UUID.randomUUID()
		repeat(5) { send("""{"kind":"idea","message":"좋아요 $it","visitorId":"$visitor"}""").andExpect { status { isAccepted() } } }
		send("""{"kind":"idea","message":"또 보냄","visitorId":"$visitor"}""").andExpect { status { isTooManyRequests() } }
	}
}
