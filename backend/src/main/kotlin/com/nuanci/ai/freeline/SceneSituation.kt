package com.nuanci.ai.freeline

import com.nuanci.scene.SceneCatalog
import org.springframework.stereotype.Component
import tools.jackson.databind.json.JsonMapper

data class SituationChoice(val id: String, val line: String, val expression: String, val reaction: String)

data class Situation(val context: String, val partnerName: String, val relation: String, val partnerLine: String, val choices: List<SituationChoice>)

// 지금 공개된 장면에서 한 상황(base·followUp)의 사실만 꺼낸다. LLM에게 넘기는 재료는 모두 여기서 나온 검증된 콘텐츠다
@Component
class SceneSituations(private val catalog: SceneCatalog, private val mapper: JsonMapper) {
	fun find(sceneId: String, step: String): Situation? {
		val entry = catalog.current().entries.firstOrNull { it.id == sceneId } ?: return null
		val scene = catalog.scene(entry.hash)?.let { mapper.readTree(it) } ?: return null
		val s = scene.path(step)
		val choices = buildList {
			for (c in s.path("choices")) {
				val id = c.path("id").asString("")
				if (id.isNotBlank()) add(SituationChoice(id, c.path("line").asString(""), c.path("expression").asString("neutral"), c.path("reaction").asString("")))
			}
		}
		if (choices.isEmpty()) return null
		return Situation(s.path("context").asString(""), scene.path("partnerName").asString(""), scene.path("relation").asString(""), s.path("partnerLine").asString(""), choices)
	}
}
