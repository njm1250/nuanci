package com.nuanci.api

import com.nuanci.TEST_ADMIN_PASSWORD
import com.nuanci.TestcontainersConfiguration
import com.nuanci.CONTENT_DIR
import com.nuanci.adminToken
import com.nuanci.loadFixtures
import com.nuanci.scene.Scene
import com.nuanci.scene.SceneRepository
import com.nuanci.scene.SceneStatus
import com.nuanci.scene.SceneStore
import com.nuanci.scene.SceneVersion
import com.nuanci.scene.SceneVersionRepository
import org.junit.jupiter.api.BeforeEach
import tools.jackson.databind.json.JsonMapper
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.nio.file.Files
import java.time.Instant

@SpringBootTest(properties = ["nuanci.admin-password=$TEST_ADMIN_PASSWORD"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@Transactional
class AdminApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var store: SceneStore
	@Autowired lateinit var mapper: JsonMapper
	@Autowired lateinit var scenes: SceneRepository
	@Autowired lateinit var versions: SceneVersionRepository

	@BeforeEach
	fun seed() = store.loadFixtures(mapper)

	private val eatALot = Files.readString(CONTENT_DIR.resolve("eat-a-lot.json"))

	private fun putScene(id: String, json: String, token: String, dryRun: Boolean = false) = mvc.put("/api/admin/scenes/$id?dryRun=$dryRun") {
		header("Authorization", "Bearer $token")
		contentType = MediaType.APPLICATION_JSON
		content = json
	}

	@Test
	fun `로그인하지 않으면 관리자 API를 쓸 수 없다`() {
		mvc.post("/api/admin/login") {
			contentType = MediaType.APPLICATION_JSON
			content = """{"id":"admin","password":"wrong"}"""
		}.andExpect { status { isUnauthorized() } }
		mvc.get("/api/admin/scenes").andExpect { status { isUnauthorized() } }
		mvc.get("/api/admin/metrics") { header("Authorization", "Bearer not-a-token") }.andExpect { status { isUnauthorized() } }
		mvc.get("/api/admin/session") { header("Authorization", "Bearer ${mvc.adminToken()}") }.andExpect { status { isNoContent() } }
	}

	@Test
	fun `로그아웃하면 토큰을 더 쓸 수 없다`() {
		val token = mvc.adminToken()
		mvc.post("/api/admin/logout") { header("Authorization", "Bearer $token") }.andExpect { status { isNoContent() } }
		mvc.get("/api/admin/session") { header("Authorization", "Bearer $token") }.andExpect { status { isUnauthorized() } }
	}

	@Test
	fun `JSON으로 새 장면을 넣으면 초안으로 들어가고 공개 API에는 안 나온다`() {
		val token = mvc.adminToken()
		val json = eatALot.replace("\"id\": \"eat-a-lot\"", "\"id\": \"new-scene\"").replace("\"number\": 1,", "\"number\": 99,").replace("\"status\": \"published\",", "")
		putScene("new-scene", json, token).andExpect {
			status { isOk() }
			jsonPath("$.created") { value(true) }
			jsonPath("$.version") { value(1) }
		}
		mvc.get("/api/admin/scenes/new-scene") { header("Authorization", "Bearer $token") }.andExpect { jsonPath("$.status") { value("draft") } }
		mvc.get("/api/scenes/new-scene").andExpect { status { isNotFound() } }

		mvc.patch("/api/admin/scenes/new-scene/status") {
			header("Authorization", "Bearer $token")
			contentType = MediaType.APPLICATION_JSON
			content = """{"status":"published"}"""
		}.andExpect { status { isNoContent() } }
		mvc.get("/api/scenes/new-scene").andExpect { status { isOk() } }
	}

	@Test
	fun `내용을 고치면 새 버전이 되고 공개 상태는 그대로다`() {
		val token = mvc.adminToken()
		val edited = eatALot.replace("\"친구를 위한 저녁상\"", "\"친구를 위한 저녁상 (수정)\"").replace("\"status\": \"published\"", "\"status\": \"draft\"")
		putScene("eat-a-lot", edited, token, dryRun = true).andExpect { jsonPath("$.changed") { value(true) } }
		mvc.get("/api/scenes/eat-a-lot").andExpect { jsonPath("$.title") { value("친구를 위한 저녁상") } }

		putScene("eat-a-lot", edited, token).andExpect { jsonPath("$.created") { value(false) } }
		mvc.get("/api/scenes/eat-a-lot").andExpect {
			status { isOk() }
			jsonPath("$.title") { value("친구를 위한 저녁상 (수정)") }
			jsonPath("$.version") { value(2) }
		}
	}

	@Test
	fun `형식이 틀리거나 번호가 겹치면 이유와 함께 거부한다`() {
		val token = mvc.adminToken()
		putScene("eat-a-lot", eatALot.replace("\"verdict\": \"bad\"", "\"verdict\": \"wrong\""), token).andExpect {
			status { isBadRequest() }
			jsonPath("$.message") { exists() }
		}
		putScene("eat-a-lot", eatALot.replace("\"trap\": \"literal\",", ""), token).andExpect {
			status { isBadRequest() }
			jsonPath("$.message") { value(org.hamcrest.Matchers.containsString("trap")) }
		}
		val taken = eatALot.replace("\"id\": \"eat-a-lot\"", "\"id\": \"copy\"")
		putScene("copy", taken, token).andExpect { status { isBadRequest() } }
		putScene("other-id", eatALot, token).andExpect { status { isBadRequest() } }
		putScene("eat-a-lot", "{not json", token).andExpect { status { isBadRequest() } }
	}

	@Test
	fun `예전 kind 형식으로 저장된 버전도 판정과 함정으로 읽는다`() {
		val legacy = """{"id":"old","title":"옛 장면","base":{"choices":[{"id":"a","kind":"literal"},{"id":"b","kind":"context"},{"id":"c","kind":"natural"}]},"followUp":{"choices":[]},"discovery":""}"""
		scenes.save(Scene("old", 900, "옛 장면", SceneStatus.PUBLISHED, 900, 1, Instant.now()))
		versions.saveAndFlush(SceneVersion("old", 1, "legacy", legacy, Instant.now()))
		mvc.get("/api/scenes/old").andExpect {
			status { isOk() }
			jsonPath("$.base.choices[0].verdict") { value("bad") }
			jsonPath("$.base.choices[0].trap") { value("literal") }
			jsonPath("$.base.choices[1].verdict") { value("meh") }
			jsonPath("$.base.choices[1].trap") { value("context") }
			jsonPath("$.base.choices[2].verdict") { value("good") }
			jsonPath("$.base.choices[2].trap") { doesNotExist() }
			jsonPath("$.base.choices[0].kind") { doesNotExist() }
		}
	}

	@Test
	fun `장면 전체의 함정 유형과 판정 구성을 모아 본다`() {
		mvc.get("/api/admin/scenes/mix") { header("Authorization", "Bearer ${mvc.adminToken()}") }.andExpect {
			status { isOk() }
			jsonPath("$.situations") { value(16) }
			jsonPath("$.traps.answer") { value(4) }
			jsonPath("$.compositions['X·X·O']") { exists() }
			jsonPath("$.warnings") { isEmpty() }
		}
	}
}
