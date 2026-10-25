package com.nuanci.api

import com.nuanci.TEST_ADMIN_PASSWORD
import com.nuanci.TestcontainersConfiguration
import com.nuanci.account.AccountStore
import com.nuanci.account.GoogleProfile
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
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.sql.Timestamp
import java.time.Instant
import java.time.ZoneId
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@SpringBootTest(properties = ["nuanci.admin-password=$TEST_ADMIN_PASSWORD"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@Transactional
class UsersApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var mapper: JsonMapper
	@Autowired lateinit var store: SceneStore
	@Autowired lateinit var accounts: AccountStore
	@Autowired lateinit var jdbc: JdbcClient

	@BeforeEach fun seed() = store.loadFixtures(mapper)
	private fun account(name: String) = accounts.upsertGoogle(GoogleProfile(UUID.randomUUID().toString(), "$name@example.com", name, null))
	private fun event(visitor: UUID, user: UUID? = null, type: String = "scene_viewed", at: Instant = Instant.now(), attempt: UUID = UUID.randomUUID()): Long =
		jdbc.sql("""
			insert into scene_event(type, scene_id, scene_version, attempt_id, visitor_id, user_id, auth_state, step, choice_id, created_at)
			values (:type, 'eat-a-lot', 1, :attempt, :visitor, :user, :state, 'base', 'eat-a-lot', :at) returning id
		""").param("type", type).param("attempt", attempt).param("visitor", visitor).param("user", user)
			.param("state", if (user == null) "guest" else "member").param("at", Timestamp.from(at)).query(Long::class.java).single()
	private fun get(path: String): JsonNode = mapper.readTree(mvc.get(path) {
		header("Authorization", "Bearer ${mvc.adminToken()}")
	}.andExpect { status { isOk() } }.andReturn().response.contentAsString)

	@Test fun `공유 브라우저의 비로그인과 다른 계정 기록을 소급해서 회원에게 붙이지 않는다`() {
		val a = account("첫회원")
		val b = account("둘째회원")
		val browser = UUID.randomUUID()
		event(browser)
		val attempt = UUID.randomUUID()
		event(browser, a, "choice_selected", attempt = attempt)
		event(browser, a, "scene_completed", attempt = attempt)
		event(browser, b)
		accounts.linkVisitor(a, browser)
		accounts.linkVisitor(b, browser)
		val first = get("/api/admin/users/accounts/$a")
		assertEquals(2, first["user"]["events"].asInt())
		assertEquals(1, first["user"]["completedScenes"].asInt())
		assertFalse(first["connections"][0]["latestLink"].asBoolean())
		assertEquals(1, get("/api/admin/users/accounts/$b")["user"]["events"].asInt())
		val detail = get("/api/admin/users/browsers/$browser")
		assertEquals(4, detail["events"].size())
		assertEquals(2, detail["connections"].size())
		val linked = detail["connections"].first { it["latestLink"].asBoolean() }
		assertEquals(b.toString(), linked["id"].asString())
		val selected = first["events"].first { it["type"].asString() == "choice_selected" }
		assertEquals("Eat a lot!", selected["line"].asString())
		assertEquals("bad", selected["verdict"].asString())
	}

	@Test fun `표현을 수정해도 타임라인에는 당시 버전의 문구가 나온다`() {
		val browser = UUID.randomUUID()
		event(browser, type = "choice_selected")
		jdbc.sql("""
			insert into scene_version(scene_id, version, content_hash, content, created_at)
			select scene_id, 2, 'new-hash', jsonb_set(content::jsonb, '{base,choices,0,line}', '"Changed expression"')::json, now()
			from scene_version where scene_id = 'eat-a-lot' and version = 1
		""").update()
		jdbc.sql("update scene set current_version = 2 where id = 'eat-a-lot'").update()
		assertEquals("Eat a lot!", get("/api/admin/users/browsers/$browser?event=choices")["events"][0]["line"].asString())
	}

	@Test fun `검색과 활동 필터를 적용하고 이벤트 없는 회원도 볼 수 있다`() {
		val a = account("활동회원")
		account("새회원")
		event(UUID.randomUUID(), a)
		val result = get("/api/admin/users?kind=accounts&q=활동회원&activity=no_completion")
		assertEquals(1, result["total"].asInt())
		assertEquals(1, result["noCompletion"].asInt())
		val empty = get("/api/admin/users?kind=accounts&q=새회원&activity=inactive7")
		assertEquals(0, empty["rows"][0]["events"].asInt())
		assertEquals(0, get("/api/admin/users?q=%27%20or%20true%20--")["total"].asInt())
		assertEquals(1, get("/api/admin/users?q=활동회원&page=10000")["page"].asInt())
	}

	@Test fun `같은 시각과 늦게 저장된 과거 이벤트를 커서로 빠짐없이 넘긴다`() {
		val browser = UUID.randomUUID()
		val at = Instant.now().minusSeconds(60)
		repeat(55) { event(browser, at = at) }
		val older = event(browser, at = at.minusSeconds(60))
		val first = get("/api/admin/users/browsers/$browser")
		assertEquals(50, first["events"].size())
		val second = get("/api/admin/users/browsers/$browser?before=${first["nextCursor"].asLong()}")
		assertEquals(6, second["events"].size())
		val ids = (first["events"].toList() + second["events"].toList()).map { it["id"].asLong() }
		assertEquals(56, ids.toSet().size)
		assertEquals(older, ids.last())
		assertTrue(second["nextCursor"].isNull)
	}

	@Test fun `로그인 연결만 있고 이벤트가 없는 브라우저도 상세 화면이 열린다`() {
		val browser = UUID.randomUUID()
		val member = account("연결회원")
		accounts.linkVisitor(member, browser)
		val result = get("/api/admin/users/browsers/$browser")
		assertEquals(0, result["user"]["events"].asInt())
		assertEquals(member.toString(), result["connections"][0]["id"].asString())
		assertTrue(result["connections"][0]["latestLink"].asBoolean())
		assertEquals(1, get("/api/admin/users?kind=browsers")["total"].asInt())
	}

	@Test fun `오늘 지표는 한국 자정부터 집계하고 첫 관측은 전체 기록으로 판단한다`() {
		val start = Instant.now().atZone(ZoneId.of("Asia/Seoul")).toLocalDate().atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant()
		val returning = UUID.randomUUID()
		val fresh = UUID.randomUUID()
		event(returning, at = start.minusMillis(1))
		event(returning, at = start)
		event(fresh, type = "scene_completed", at = start)
		val result = get("/api/admin/metrics?period=today")
		assertEquals(2, result["visitors"].asInt())
		assertEquals(2, result["events"].asInt())
		assertEquals(1, result["daily"].size())
		assertEquals(1, result["daily"][0]["newVisitors"].asInt())
		assertEquals(1, result["daily"][0]["completed"].asInt())
		val filtered = get("/api/admin/metrics?period=today&audience=member")
		assertEquals(0, filtered["daily"][0]["visitors"].asInt())
		assertEquals(7, get("/api/admin/metrics?period=7d")["daily"].size())
	}

	@Test fun `내부 브라우저를 제외하고 설정을 되돌리면 지표에 복구한다`() {
		val browser = UUID.randomUUID()
		val member = account("내부회원")
		accounts.linkVisitor(member, browser)
		event(browser, member)
		val token = mvc.adminToken()
		mvc.post("/api/admin/metrics/internal-visitors") {
			header("Authorization", "Bearer $token"); contentType = MediaType.APPLICATION_JSON; content = """{"visitorId":"$browser"}"""
		}.andExpect { status { isNoContent() } }
		assertEquals(0, get("/api/admin/users?kind=browsers")["total"].asInt())
		assertEquals(0, get("/api/admin/users?q=내부회원")["total"].asInt())
		assertTrue(get("/api/admin/users?kind=browsers&includeInternal=true")["rows"][0]["internal"].asBoolean())
		mvc.delete("/api/admin/metrics/internal-visitors/$browser") { header("Authorization", "Bearer $token") }
			.andExpect { status { isNoContent() } }
		assertEquals(1, get("/api/admin/users?kind=browsers")["total"].asInt())
		assertEquals(1, get("/api/admin/metrics?period=today")["visitors"].asInt())
	}

	@Test fun `회원 정보와 내부 방문 변경은 관리자만 접근하고 잘못된 필터는 거절한다`() {
		val id = UUID.randomUUID()
		mvc.get("/api/admin/users").andExpect { status { isUnauthorized() } }
		mvc.get("/api/admin/users/accounts/$id").andExpect { status { isUnauthorized() } }
		mvc.delete("/api/admin/metrics/internal-visitors/$id").andExpect { status { isUnauthorized() } }
		val token = mvc.adminToken()
		listOf("/api/admin/users?sort=invalid", "/api/admin/users?kind=invalid", "/api/admin/users?page=0", "/api/admin/metrics?period=invalid").forEach { path ->
			mvc.get(path) { header("Authorization", "Bearer $token") }.andExpect { status { isBadRequest() } }
		}
		mvc.get("/api/admin/users/accounts/$id") { header("Authorization", "Bearer $token") }.andExpect { status { isNotFound() } }
	}
}
