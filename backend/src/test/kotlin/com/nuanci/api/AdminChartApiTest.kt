package com.nuanci.api

import com.nuanci.TEST_ADMIN_PASSWORD
import com.nuanci.TestcontainersConfiguration
import com.nuanci.adminToken
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import tools.jackson.databind.json.JsonMapper

@SpringBootTest(properties = ["nuanci.admin-password=$TEST_ADMIN_PASSWORD"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
class AdminChartApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var mapper: JsonMapper

	@Test
	fun `보드의 기본 차트는 조회 전용 역할로 지표 뷰를 읽어 모두 오류 없이 돈다`() {
		val token = mvc.adminToken()
		mvc.get("/api/admin/charts/board?days=14").andExpect { status { isUnauthorized() } }
		val board = mapper.readTree(mvc.get("/api/admin/charts/board?days=0") { header("Authorization", "Bearer $token") }.andReturn().response.contentAsString)
		val charts = board.path("charts")
		assertTrue(charts.size() >= 18)
		charts.forEach { assertTrue(it.path("error").isNull, "${it.path("chart").path("title").asString()}: ${it.path("error").asString()}") }
	}

	@Test
	fun `차트를 저장하고 자리를 바꾸고 지운다`() {
		val token = mvc.adminToken()
		val body = mapOf("title" to "시험 차트", "sql" to "select day, count(*) as n from metrics.visitor_day where day >= {{since}} group by 1", "kind" to "bar", "xCol" to "day", "yCol" to "n", "width" to 2)
		val saved = mapper.readTree(mvc.post("/api/admin/charts") {
			header("Authorization", "Bearer $token")
			contentType = MediaType.APPLICATION_JSON
			content = mapper.writeValueAsString(body)
		}.andExpect { status { isCreated() } }.andReturn().response.contentAsString)
		val id = saved.path("id").asLong()
		val moved = mapper.readTree(mvc.post("/api/admin/charts/$id/move?dir=up") { header("Authorization", "Bearer $token") }.andReturn().response.contentAsString)
		assertEquals(id, moved[moved.size() - 2].path("id").asLong())
		mvc.post("/api/admin/charts") {
			header("Authorization", "Bearer $token")
			contentType = MediaType.APPLICATION_JSON
			content = mapper.writeValueAsString(body + ("kind" to "pie"))
		}.andExpect { status { isBadRequest() } }
		mvc.delete("/api/admin/charts/$id") { header("Authorization", "Bearer $token") }.andExpect { status { isNoContent() } }
		mvc.get("/api/admin/charts/$id") { header("Authorization", "Bearer $token") }.andExpect { status { isNotFound() } }
	}

	@Test
	fun `콘솔 조회도 {{since}}를 기간 시작일로 바꾼다`() {
		val res = mapper.readTree(mvc.post("/api/admin/query") {
			header("Authorization", "Bearer ${mvc.adminToken()}")
			contentType = MediaType.APPLICATION_JSON
			content = mapper.writeValueAsString(mapOf("sql" to "select {{since}} = (now() at time zone 'Asia/Seoul')::date - 6 as ok", "days" to 7))
		}.andExpect { status { isOk() } }.andReturn().response.contentAsString)
		assertEquals("t", res.path("rows")[0][0].asString())
	}
}
