package com.nuanci.scene

import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SceneCheckTest {
	private val mapper = JsonMapper.builder().build()

	private fun situation(choices: List<Pair<String, String>>) = mapOf("choices" to choices.map { (verdict, line) -> mapOf("verdict" to verdict, "line" to line) })

	private fun scene(vararg choices: Pair<String, String>) =
		mapper.readTree(mapper.writeValueAsString(mapOf("base" to situation(choices.toList()), "followUp" to situation(choices.toList()))))

	@Test
	fun `자연스러운 말과 어색한 말이 섞여 있고 길이가 비슷하면 경고가 없다`() {
		assertEquals(emptyList(), SceneCheck.warnings(scene("bad" to "Fighting!", "meh" to "Cheer up!", "good" to "You got this!")))
		assertEquals(emptyList(), SceneCheck.warnings(scene("bad" to "Yes.", "bad" to "Yes, I didn't.", "good" to "No, I didn't!")))
	}

	@Test
	fun `자연스러운 말만 눈에 띄게 길면 경고한다`() {
		val warnings = SceneCheck.warnings(scene("bad" to "Don't be sad.", "meh" to "Good job!", "good" to "Hey, everyone starts somewhere."))
		assertEquals(2, warnings.size)
		assertTrue(warnings.all { "눈에 띄게 길어요" in it })
	}

	@Test
	fun `자연스러운 말이 없거나 전부 자연스러우면 경고한다`() {
		assertTrue(SceneCheck.warnings(scene("bad" to "Eat a lot!", "meh" to "Enjoy.", "bad" to "Eat!")).any { "자연스러운 말이 없어요" in it })
		assertTrue(SceneCheck.warnings(scene("good" to "Help yourself!", "good" to "Dig in!", "good" to "Go ahead!")).any { "어색한 말이 없어요" in it })
	}

	@Test
	fun `웃긴 동작이 장면에 너무 많으면 경고한다`() {
		val choices = listOf("bad" to "faint", "meh" to "flop", "good" to "spin").map { (verdict, motion) -> mapOf("verdict" to verdict, "line" to "Hi!", "motion" to motion) }
		val content = mapper.readTree(mapper.writeValueAsString(mapOf("base" to mapOf("choices" to choices), "followUp" to mapOf("choices" to choices))))
		assertTrue(SceneCheck.warnings(content).any { "웃긴 동작이 6개" in it })
	}

	@Test
	fun `장면 전체에서 함정이나 판정 구성이 한쪽으로 몰리면 경고한다`() {
		val same = listOf(mapOf("verdict" to "bad", "trap" to "literal"), mapOf("verdict" to "meh", "trap" to "literal"), mapOf("verdict" to "good"))
		val content = mapper.readTree(mapper.writeValueAsString(mapOf("base" to mapOf("choices" to same), "followUp" to mapOf("choices" to same))))
		val mix = SceneCheck.mix(List(3) { content })
		assertEquals(6, mix.situations)
		assertEquals(12, mix.traps["literal"])
		assertEquals(mapOf("X·△·O" to 6), mix.compositions)
		assertTrue(mix.warnings.any { "'직역'에 몰려" in it })
		assertTrue(mix.warnings.any { "X·△·O가 너무 많아요" in it })
	}
}
