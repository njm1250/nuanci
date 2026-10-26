package com.nuanci.api

import com.nuanci.TEST_ADMIN_PASSWORD
import com.nuanci.TestcontainersConfiguration
import com.nuanci.account.AccountStore
import com.nuanci.account.GoogleProfile
import com.nuanci.adminToken
import com.nuanci.loadFixtures
import com.nuanci.operations.ProgressionRules
import com.nuanci.operations.ProgressionSettingsStore
import com.nuanci.operations.RankRule
import com.nuanci.operations.SaveProgressionSettings
import com.nuanci.reward.RewardStore
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
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@SpringBootTest(properties = ["nuanci.admin-password=$TEST_ADMIN_PASSWORD"])
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
@Transactional
class ProgressionSettingsApiTest {
	@Autowired lateinit var mvc: MockMvc
	@Autowired lateinit var mapper: JsonMapper
	@Autowired lateinit var jdbc: JdbcClient
	@Autowired lateinit var scenes: SceneStore
	@Autowired lateinit var rewards: RewardStore
	@Autowired lateinit var accounts: AccountStore
	private val defaults get() = ProgressionSettingsStore.DEFAULTS

	@BeforeEach fun seed() = scenes.loadFixtures(mapper)
	private fun save(rules: ProgressionRules, version: Int = 0) = mvc.put("/api/admin/settings/progression") {
		header("Authorization", "Bearer ${mvc.adminToken()}")
		contentType = MediaType.APPLICATION_JSON
		content = mapper.writeValueAsString(SaveProgressionSettings(version, rules))
	}
	private fun clear(visitor: UUID, scene: String): JsonNode = mapper.readTree(mvc.post("/api/rewards/clear") {
		contentType = MediaType.APPLICATION_JSON
		content = mapper.writeValueAsString(mapOf("visitorId" to visitor, "sceneId" to scene))
	}.andExpect { status { isOk() } }.andReturn().response.contentAsString)
	private fun sync(visitor: UUID): JsonNode = mapper.readTree(mvc.post("/api/rewards/sync") {
		contentType = MediaType.APPLICATION_JSON
		content = mapper.writeValueAsString(mapOf("visitorId" to visitor))
	}.andExpect { status { isOk() } }.andReturn().response.contentAsString)
	private fun JsonNode.item(id: String) = this["items"].first { it["id"].asString() == id }

	@Test fun `기본 직급을 공개하고 보상 설정은 관리자에게만 보여 준다`() {
		mvc.get("/api/admin/settings/progression").andExpect { status { isUnauthorized() } }
		mvc.put("/api/admin/settings/progression") {
			contentType = MediaType.APPLICATION_JSON; content = mapper.writeValueAsString(SaveProgressionSettings(0, defaults))
		}.andExpect { status { isUnauthorized() } }
		val public = mapper.readTree(mvc.get("/api/progression/ranks").andExpect { status { isOk() } }.andReturn().response.contentAsString)
		assertEquals(0, public["ranks"][0]["min"].asInt())
		assertEquals("인턴", public["ranks"][0]["name"].asString())
		assertFalse(public.has("milestones"))
		assertFalse(public.has("boxes"))
	}

	@Test fun `직급 변경을 DB에 저장하고 오래된 버전으로 덮어쓰지 못한다`() {
		val rules = defaults.copy(ranks = listOf(RankRule(0, "연습생"), RankRule(5, " 사원 "), RankRule(12, "팀장")))
		save(rules).andExpect { status { isOk() }; jsonPath("$.version") { value(1) } }
		val stored = ProgressionSettingsStore(jdbc, mapper).current()
		assertEquals("사원", stored.rules.ranks[1].name)
		assertEquals(5, stored.rules.ranks[1].min)
		assertTrue(stored.updatedAt != null)
		save(defaults).andExpect { status { isConflict() } }
		mvc.get("/api/progression/ranks").andExpect { jsonPath("$.ranks[2].name") { value("팀장") } }
		save(defaults, 1).andExpect { status { isOk() }; jsonPath("$.version") { value(2) } }
	}

	@Test fun `잘못된 직급 순서와 보상 기준은 저장하지 않는다`() {
		val invalid = listOf(
			defaults.copy(ranks = emptyList()),
			defaults.copy(ranks = listOf(RankRule(1, "사원"))),
			defaults.copy(ranks = listOf(RankRule(0, "인턴"), RankRule(5, "사원"), RankRule(4, "팀장"))),
			defaults.copy(ranks = listOf(RankRule(0, "동일"), RankRule(2, " 동일 "))),
			defaults.copy(ranks = listOf(RankRule(0, " "))),
			defaults.copy(boxes = listOf(3, 3)),
			defaults.copy(boxes = listOf(0)),
			defaults.copy(boxes = (1..(ProgressionSettingsStore.BOX_POOL_SIZE + 1)).toList()),
			defaults.copy(milestones = defaults.milestones - "cap"),
			defaults.copy(milestones = defaults.milestones + ("cap" to -1)),
		)
		invalid.forEach { rules -> save(rules).andExpect { status { isBadRequest() }; jsonPath("$.message") { isNotEmpty() } } }
		assertEquals(0, ProgressionSettingsStore(jdbc, mapper).current().version)
	}

	@Test fun `새 기준으로 지급과 다음 목표를 계산하고 기존 보상과 획득 기준은 유지한다`() {
		val visitor = UUID.randomUUID()
		val milestones = defaults.milestones.mapValues { 50 } + mapOf("cap" to 4, "plant" to 2)
		save(defaults.copy(milestones = milestones, boxes = listOf(3, 7))).andExpect { status { isOk() } }
		val one = clear(visitor, "my-treat")
		assertTrue(one.item("cap")["owned"].isNull)
		assertEquals("화분", one["next"]["name"].asString())
		assertEquals(1, one["next"]["remaining"].asInt())
		val two = clear(visitor, "file-request")
		assertEquals(2, two.item("plant")["owned"]["count"].asInt())
		assertEquals("box", two["next"]["type"].asString())
		clear(visitor, "get-home-safe")
		assertEquals(1, rewards.grants(visitor).count { it.reason == "box" })
		val four = clear(visitor, "eat-a-lot")
		assertEquals(4, four.item("cap")["owned"]["count"].asInt())
		val owned = rewards.grants(visitor).map { it.rewardId }.toSet()
		val raised = defaults.copy(milestones = milestones + mapOf("cap" to 20, "plant" to 30), boxes = listOf(8, 12, 20))
		save(raised, 1).andExpect { status { isOk() } }
		val after = sync(visitor)
		assertEquals(owned, rewards.grants(visitor).map { it.rewardId }.toSet())
		assertEquals(4, after.item("cap")["owned"]["count"].asInt())
		assertEquals(2, after.item("plant")["owned"]["count"].asInt())
		assertEquals("box", after["next"]["type"].asString())
		assertEquals(8, after["next"]["remaining"].asInt())
		val member = accounts.upsertGoogle(GoogleProfile(UUID.randomUUID().toString(), "settings@example.com", "회원", null))
		rewards.mergeVisitor(visitor, member)
		assertEquals(4, rewards.grants(member).first { it.rewardId == "cap" }.milestoneCount)
	}

	@Test fun `기준을 낮추면 추가 지급하고 상자를 꺼도 이미 받은 것은 남는다`() {
		val visitor = UUID.randomUUID()
		clear(visitor, "my-treat")
		save(defaults.copy(milestones = defaults.milestones + ("plant" to 1), boxes = listOf(1))).andExpect { status { isOk() } }
		val result = sync(visitor)
		assertFalse(result.item("plant")["owned"].isNull)
		assertEquals(1, result.item("plant")["owned"]["count"].asInt())
		assertEquals(1, rewards.grants(visitor).count { it.reason == "box" })
		save(defaults.copy(boxes = emptyList()), 1).andExpect { status { isOk() } }
		sync(visitor)
		assertEquals(1, rewards.grants(visitor).count { it.reason == "box" })
		assertFalse(sync(visitor).item("plant")["owned"].isNull)
	}

	@Test fun `변경 기능 도입 전에 받은 보상은 기존 획득 장면 수를 쓴다`() {
		val visitor = UUID.randomUUID()
		clear(visitor, "my-treat")
		jdbc.sql("update reward_grant set milestone_count = null where owner_id = :owner").param("owner", visitor).update()
		save(defaults.copy(milestones = defaults.milestones + ("cap" to 100))).andExpect { status { isOk() } }
		assertEquals(1, sync(visitor).item("cap")["owned"]["count"].asInt())
	}
}
