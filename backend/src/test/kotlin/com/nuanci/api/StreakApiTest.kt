package com.nuanci.api

import com.nuanci.TestcontainersConfiguration
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@Transactional
class StreakApiTest {
	@Autowired lateinit var mvc: MockMvc

	@Test
	fun `오늘 처음 장면을 끝내면 이어지고 같은 날 다시 해도 하루로 센다`() {
		val body = """{"visitorId":"${UUID.randomUUID()}"}"""
		mvc.post("/api/streak/play") { contentType = MediaType.APPLICATION_JSON; content = body }.andExpect {
			jsonPath("$.current") { value(1) }
			jsonPath("$.today") { value(true) }
			jsonPath("$.extended") { value(true) }
			jsonPath("$.nextBadge") { value(3) }
		}
		mvc.post("/api/streak/play") { contentType = MediaType.APPLICATION_JSON; content = body }.andExpect {
			jsonPath("$.current") { value(1) }
			jsonPath("$.extended") { value(false) }
		}
	}
}
