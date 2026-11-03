package com.nuanci.scene

import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import tools.jackson.databind.node.ObjectNode

// 화면이 장면 전체를 받아 직접 추리던 계산을 발행할 때 한 번만 한다. 결과는 장면 본문처럼 해시 주소로 내보낸다.
// 표현 모음(book)은 장면마다 배울 표현 한 쌍, 홈 데모(reel)는 첫 방문자에게 자동으로 돌리는 직역 사고 장면이다
object SceneViews {
	// 배열 노드의 원소. 없는 필드나 배열이 아닌 값이면 빈 목록이다
	private fun JsonNode.items(): List<JsonNode> = if (isArray) (0 until size()).map { get(it) } else emptyList()

	// 첫 방문에 바로 하게 될 앞쪽 장면은 데모에 쓰지 않는다. 데모에서 오답과 반응을 먼저 보면 그 장면에서 틀리는 재미가 사라진다
	private const val FIRST_SESSION = 10
	private const val REEL_COUNT = 3
	private val GAG_MOTIONS = setOf("faint", "flop", "spin", "shiver", "dance", "panic")

	// 데모로 고른 순간. 한국 사람이 영어로도 통하겠지 하고 쓰는 콩글리시가 엉뚱하게 들리는 것
	private val REEL_PICKS = listOf(
		Triple("battery-three-percent", "consent", "콘센트 어디 있어?"),
		Triple("two-am-store", "cider", "사이다 어디 있어요?"),
		Triple("water-is-self", "water-is-self", "물은 셀프야!"),
	)

	fun book(mapper: JsonMapper, scenes: List<ObjectNode>): JsonNode =
		mapper.valueToTree(
			scenes.map { scene ->
				val pairs = listOfNotNull(
					pair(scene.path("base"), scene.path("relation").asString(""), scene.path("place").asString("")),
					pair(scene.path("followUp"), scene.path("relation").asString(""), scene.path("followUp").path("to").asString("")),
				)
				mapOf("id" to scene.path("id").asString(), "number" to scene.path("number").asInt(), "title" to scene.path("title").asString(), "relation" to scene.path("relation").asString(""), "place" to scene.path("place").asString(""), "pairs" to pairs)
			},
		)

	// 틀린 쪽은 X를 먼저, 없으면 △를 쓴다
	private fun pair(situation: JsonNode, who: String, `when`: String): Map<String, Any?>? {
		val choices = situation.path("choices").items()
		val right = choices.firstOrNull { it.path("verdict").asString() == "good" } ?: return null
		val wrong = choices.firstOrNull { it.path("verdict").asString() == "bad" } ?: choices.firstOrNull { it.path("verdict").asString() == "meh" } ?: return null
		return mapOf(
			"intent" to situation.path("intent").asString(""),
			"who" to who,
			"when" to `when`,
			"wrong" to wrong.path("line").asString(""),
			"trap" to wrong.path("trap").asString(null),
			"right" to right.path("line").asString(""),
			"alts" to choices.filter { it.path("verdict").asString() == "good" && it !== right }.map { it.path("line").asString("") },
			"sources" to situation.path("sources").takeUnless { it.isMissingNode },
		)
	}

	fun reel(mapper: JsonMapper, scenes: List<ObjectNode>): JsonNode {
		val later = scenes.drop(FIRST_SESSION)
		val picked = REEL_PICKS.mapNotNull { (id, choiceId, ask) ->
			val scene = later.firstOrNull { it.path("id").asString() == id } ?: return@mapNotNull null
			val situation = listOf(scene.path("base"), scene.path("followUp")).firstOrNull { s -> s.has("stage") && s.path("choices").items().any { it.path("id").asString() == choiceId } } ?: return@mapNotNull null
			id to beat(mapper, situation, situation.path("choices").items().first { it.path("id").asString() == choiceId }, ask)
		}
		val fill = later.filter { s -> picked.none { it.first == s.path("id").asString() } }.mapNotNull { scene ->
			listOf(scene.path("base"), scene.path("followUp"))
				.mapNotNull { s -> s.path("choices").items().firstOrNull { it.path("verdict").asString() == "bad" }?.takeIf { s.has("stage") }?.let { s to it } }
				.sortedByDescending { (_, c) -> funny(c) }
				.firstOrNull()
				?.takeIf { (_, c) -> funny(c) == 1 }
				?.let { (s, c) -> beat(mapper, s, c, null) }
		}
		return mapper.valueToTree((picked.map { it.second } + fill).take(REEL_COUNT))
	}

	private fun funny(choice: JsonNode) = if (choice.path("motion").asString("") in GAG_MOTIONS || choice.has("meProp")) 1 else 0

	private fun beat(mapper: JsonMapper, situation: JsonNode, choice: JsonNode, ask: String?): Map<String, Any?> {
		val stage = (situation.path("stage").deepCopy() as ObjectNode)
		val flags = situation.path("stage").path("flags").items().map { it.asString() } + choice.path("flags").items().map { it.asString() }
		stage.set("flags", mapper.valueToTree(flags))
		val tags = choice.path("tags")
		return mapOf(
			"stage" to stage,
			"partnerLine" to situation.path("partnerLine").asString(""),
			"partnerIdle" to situation.path("partnerIdle").path("motion").asString("idle"),
			"partnerIdleProp" to situation.path("partnerIdle").path("prop").asString(null),
			"ask" to (ask ?: choice.path("meaning").asString("")),
			"line" to choice.path("line").asString(""),
			"expression" to choice.path("expression").asString(""),
			"motion" to choice.path("motion").asString(""),
			"meMotion" to choice.path("meMotion").asString(null),
			"meProp" to choice.path("meProp").asString(null),
			"partnerProp" to choice.path("partnerProp").asString(null),
			"punch" to (tags.get(1)?.asString() ?: choice.path("reaction").asString("")),
		)
	}
}
