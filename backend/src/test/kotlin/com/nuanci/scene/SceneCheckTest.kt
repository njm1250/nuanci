package com.nuanci.scene

import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SceneCheckTest {
	private val mapper = JsonMapper.builder().build()

	private fun scene(vararg choices: Pair<String, String>) = mapper.readTree(
		mapper.writeValueAsString(
			mapOf(
				"base" to mapOf("choices" to choices.map { (kind, line) -> mapOf("kind" to kind, "line" to line) }),
				"followUp" to mapOf("choices" to choices.map { (kind, line) -> mapOf("kind" to kind, "line" to line) }),
			),
		),
	)

	@Test
	fun `세 종류가 하나씩이고 길이가 비슷하면 경고가 없다`() {
		assertEquals(emptyList(), SceneCheck.warnings(scene("literal" to "Fighting!", "context" to "Cheer up!", "natural" to "You got this!")))
	}

	@Test
	fun `자연스러운 표현만 눈에 띄게 길면 경고한다`() {
		val warnings = SceneCheck.warnings(scene("literal" to "Don't be sad.", "context" to "Good job!", "natural" to "Hey, everyone starts somewhere."))
		assertEquals(2, warnings.size)
		assertTrue(warnings.all { "눈에 띄게 길어요" in it })
	}

	@Test
	fun `종류가 빠지거나 겹치면 경고한다`() {
		val warnings = SceneCheck.warnings(scene("literal" to "Eat a lot!", "natural" to "Help yourself!", "natural" to "Dig in!"))
		assertTrue(warnings.any { "맥락 주의 표현이 0개" in it })
		assertTrue(warnings.any { "자연스러운 표현이 2개" in it })
	}

	@Test
	fun `웃긴 동작이 장면에 너무 많으면 경고한다`() {
		val choices = listOf("literal" to "faint", "context" to "flop", "natural" to "spin").map { (kind, motion) -> mapOf("kind" to kind, "line" to "Hi!", "motion" to motion) }
		val content = mapper.readTree(mapper.writeValueAsString(mapOf("base" to mapOf("choices" to choices), "followUp" to mapOf("choices" to choices))))
		assertTrue(SceneCheck.warnings(content).any { "웃긴 동작이 6개" in it })
	}
}
