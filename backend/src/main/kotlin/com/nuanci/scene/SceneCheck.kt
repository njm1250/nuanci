package com.nuanci.scene

import tools.jackson.databind.JsonNode

// 공개 전 검수에서 볼 항목. 형식 오류와 달리 공개를 막지는 않고 경고로만 보여준다
object SceneCheck {
	val KINDS = listOf("literal", "context", "natural")
	private val KIND_LABELS = mapOf("literal" to "직역", "context" to "맥락 주의", "natural" to "자연스러운")
	private val STEPS = listOf("base" to "기본 상황", "followUp" to "만약에")

	// 정답만 이만큼 넘게 길면 길이만 보고도 고를 수 있다
	private const val GIVEAWAY_LENGTH = 5

	// 과장된 동작은 가끔 나와야 웃기다
	private val FUNNY_MOTIONS = setOf("faint", "flop", "spin", "shiver")
	private const val MAX_FUNNY = 2

	fun warnings(content: JsonNode): List<String> {
		val out = mutableListOf<String>()
		for ((step, label) in STEPS) {
			val choices = content.path(step).path("choices").toList()
			if (choices.size != 3) out += "${label}: 선택지가 ${choices.size}개예요 (3개 권장)"
			val counts = choices.groupingBy { it.path("kind").asString("") }.eachCount()
			for (kind in KINDS) {
				val n = counts[kind] ?: 0
				if (n != 1) out += "${label}: ${KIND_LABELS[kind]} 표현이 ${n}개예요"
			}
			val natural = choices.filter { it.path("kind").asString("") == "natural" }.map { it.path("line").asString("").length }
			val others = choices.filter { it.path("kind").asString("") != "natural" }.map { it.path("line").asString("").length }
			if (natural.size == 1 && others.isNotEmpty() && natural[0] > others.max() + GIVEAWAY_LENGTH) {
				out += "${label}: 자연스러운 표현만 눈에 띄게 길어요 (${natural[0]}자, 나머지 최대 ${others.max()}자)"
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
}
