package com.nuanci.scene

import tools.jackson.databind.JsonNode

data class SceneMix(val situations: Int, val traps: Map<String, Int>, val compositions: Map<String, Int>, val warnings: List<String>)

// 공개 전 검수에서 볼 항목. 형식 오류와 달리 공개를 막지는 않고 경고로만 보여준다
object SceneCheck {
	// 판정은 들었을 때 어떤지(O / △ / X), 함정은 왜 어색한지다. 자연스러운 말에는 함정이 없다
	val VERDICTS = listOf("good", "meh", "bad")
	val TRAPS = linkedMapOf(
		"literal" to "직역",
		"konglish" to "콩글리시",
		"answer" to "대답 방식",
		"textbook" to "교과서식",
		"blunt" to "너무 직설적",
		"formal" to "너무 격식",
		"context" to "맥락 어긋남",
		"misread" to "다른 뜻으로 들림",
		"culture" to "문화 차이",
	)
	private val VERDICT_MARKS = mapOf("bad" to "X", "meh" to "△", "good" to "O")
	private val STEPS = listOf("base" to "기본 상황", "followUp" to "만약에")

	// 자연스러운 말이 모두 이만큼 넘게 길면 길이만 보고도 고를 수 있다
	private const val GIVEAWAY_LENGTH = 5

	// 과장된 동작은 가끔 나와야 웃기다
	private val FUNNY_MOTIONS = setOf("faint", "flop", "spin", "shiver", "dance", "panic")
	private const val MAX_FUNNY = 2

	// 여러 장면에 걸쳐 같은 함정이나 같은 판정 구성이 이 비율을 넘으면 패턴으로 답을 맞히게 된다
	private const val MAX_TRAP_SHARE = 0.35
	private const val MAX_COMPOSITION_SHARE = 0.6
	private const val MIN_SITUATIONS_FOR_MIX = 6

	fun warnings(content: JsonNode): List<String> {
		val out = mutableListOf<String>()
		for ((step, label) in STEPS) {
			val choices = content.path(step).path("choices").toList()
			// 많이 풀리는 장면은 구경할 반응을 늘리려고 보기를 5~6개까지 둔다
			if (choices.size !in 3..6) out += "${label}: 선택지가 ${choices.size}개예요 (3~6개 권장)"
			val good = choices.filter { verdict(it) == "good" }
			val others = choices.filter { verdict(it) != "good" }
			if (good.isEmpty()) out += "${label}: 자연스러운 말이 없어요"
			if (others.isEmpty()) out += "${label}: 어색한 말이 없어요"
			if (good.isNotEmpty() && others.isNotEmpty()) {
				val shortest = good.minOf { it.path("line").asString("").length }
				val rest = others.maxOf { it.path("line").asString("").length }
				if (shortest > rest + GIVEAWAY_LENGTH) out += "${label}: 자연스러운 말만 눈에 띄게 길어요 (${shortest}자, 나머지 최대 ${rest}자)"
			}
		}
		val motions = STEPS.flatMap { (step, _) ->
			val situation = content.path(step)
			situation.path("choices").toList().map { it.path("motion").asString("") } + situation.path("partnerIdle").path("motion").asString("")
		}
		val funny = motions.count { it in FUNNY_MOTIONS }
		if (funny > MAX_FUNNY) out += "웃긴 동작이 ${funny}개예요 (장면당 ${MAX_FUNNY}개 이하 권장)"
		return out
	}

	// 공개·초안 장면 전체에서 함정 유형과 판정 구성(예: X·△·O)이 한쪽으로 몰렸는지 본다
	fun mix(contents: List<JsonNode>): SceneMix {
		val situations = contents.flatMap { c -> STEPS.map { (step, _) -> c.path(step).path("choices").toList() } }
		val traps = TRAPS.keys.associateWith { key -> situations.sumOf { s -> s.count { it.path("trap").asString("") == key } } }
		val compositions = situations
			.map { s -> s.mapNotNull { VERDICT_MARKS[verdict(it)] }.sortedBy { listOf("X", "△", "O").indexOf(it) }.joinToString("·") }
			.groupingBy { it }.eachCount()
			.entries.sortedByDescending { it.value }.associate { it.key to it.value }
		val out = mutableListOf<String>()
		if (situations.size >= MIN_SITUATIONS_FOR_MIX) {
			val trapTotal = traps.values.sum()
			traps.filter { trapTotal > 0 && it.value.toDouble() / trapTotal > MAX_TRAP_SHARE }.forEach { (key, n) ->
				out += "함정이 '${TRAPS[key]}'에 몰려 있어요 (${n * 100 / trapTotal}%)"
			}
			compositions.filter { it.value.toDouble() / situations.size > MAX_COMPOSITION_SHARE }.forEach { (key, n) ->
				out += "판정 구성 ${key}가 너무 많아요 (상황 ${situations.size}개 중 ${n}개)"
			}
		}
		return SceneMix(situations.size, traps, compositions, out)
	}

	private fun verdict(choice: JsonNode) = choice.path("verdict").asString("")
}
