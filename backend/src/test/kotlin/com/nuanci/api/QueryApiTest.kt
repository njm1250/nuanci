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
import tools.jackson.databind.json.JsonMapper

@SpringBootTest(properties = ["nuanci.admin-password=$TEST_ADMIN_PASSWORD"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
class QueryApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var mapper: JsonMapper

	private fun query(sql: String, token: String = mvc.adminToken()) = mvc.post("/api/admin/query") {
		header("Authorization", "Bearer $token")
		contentType = MediaType.APPLICATION_JSON
		content = mapper.writeValueAsString(mapOf("sql" to sql))
	}

	@Test
	fun `관리자만 스키마와 조회를 실행한다`() {
		mvc.get("/api/admin/query/schema").andExpect { status { isUnauthorized() } }
		query("select 1", "invalid").andExpect { status { isUnauthorized() } }
		mvc.get("/api/admin/query/schema") { header("Authorization", "Bearer ${mvc.adminToken()}") }.andExpect {
			status { isOk() }
			jsonPath("$[?(@.name == 'scene_event')].columns") { isNotEmpty() }
			jsonPath("$[?(@.name == 'user_session')]") { isEmpty() }
		}
	}

	@Test
	fun `SELECT와 CTE의 컬럼과 NULL을 돌려주고 500행으로 제한한다`() {
		query("WITH sample AS (SELECT 42 AS answer, NULL::text AS empty) SELECT * FROM sample;").andExpect {
			status { isOk() }
			jsonPath("$.columns[0]") { value("answer") }
			jsonPath("$.rows[0][0]") { value("42") }
			jsonPath("$.rows[0][1]") { value(org.hamcrest.Matchers.nullValue()) }
			jsonPath("$.truncated") { value(false) }
		}
		query("select generate_series(1, 501) as n").andExpect {
			status { isOk() }
			jsonPath("$.rows.length()") { value(500) }
			jsonPath("$.truncated") { value(true) }
		}
		query("select current_user, current_setting('transaction_read_only')").andExpect {
			status { isOk() }
			jsonPath("$.rows[0][0]") { value("nuanci_query_reader") }
			jsonPath("$.rows[0][1]") { value("on") }
		}
	}

	@Test
	fun `쓰기와 다중문장과 CTE 우회와 세션 접근을 막는다`() {
		listOf(
			"update scene set title = 'changed'",
			"delete from scene_event",
			"select 1; delete from scene_event",
			"with changed as (delete from scene_event returning *) select * from changed",
			"select * into test_copy from scene",
			"select * from user_session",
			"select set_config('role', 'none', true)",
		).forEach { query(it).andExpect { status { isBadRequest() } } }
		query("select * from missing_table").andExpect {
			status { isBadRequest() }
			jsonPath("$.message") { exists() }
		}
		query("select count(*) from scene_event").andExpect { status { isOk() } }
	}

	@Test
	fun `긴 조회는 중단하고 다음 조회는 정상 실행한다`() {
		query("select pg_sleep(10)").andExpect {
			status { isBadRequest() }
			jsonPath("$.message") { value(org.hamcrest.Matchers.containsString("5초")) }
		}
		query("select 1").andExpect { status { isOk() } }
	}
}
