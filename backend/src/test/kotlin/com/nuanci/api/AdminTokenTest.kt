package com.nuanci.api

import com.nuanci.TestcontainersConfiguration
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest(properties = ["nuanci.admin-token=secret"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
class AdminTokenTest {
	@Autowired lateinit var mvc: MockMvc

	@Test
	fun `토큰이 설정되면 지표는 토큰이 있어야 볼 수 있다`() {
		mvc.get("/api/admin/metrics").andExpect { status { isUnauthorized() } }
		mvc.get("/api/admin/metrics") { header("X-Admin-Token", "wrong") }.andExpect { status { isUnauthorized() } }
		mvc.get("/api/admin/metrics") { header("X-Admin-Token", "secret") }.andExpect { status { isOk() } }
	}
}
