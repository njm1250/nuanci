package com.nuanci.ai.freeline

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import java.util.UUID

// 화면이 받는 결과. outcome에 따라 화면이 Mochi의 말과 무대 반응을 고른다
data class FreeLineResult(
	val outcome: String,
	val matchedChoiceId: String? = null,
	val verdict: String? = null,
	val heard: String? = null,
	val expression: String? = null,
	val thought: String? = null,
)

// "내 말로 해 보기" 흐름. 1단계로 가장 가까운 보기에 대 보고, 대지 못했을 때만 2단계로 상대 반응을 쓴다.
// 두 단계를 한 호출에 섞지 않는다. 반응을 쓸 수 있다는 선택지가 있으면 고르기 판단이 흔들린다.
// 결과는 모두 missing_intent에 남겨, 대지 못한 새 말과 상상한 반응이 다음 보기 후보가 된다
@Service
class FreeLineService(
	private val situations: SceneSituations,
	private val matcher: IntentMatcher,
	private val writer: ReactionWriter,
	private val jdbc: JdbcClient,
) {
	fun handle(visitorId: UUID, sceneId: String, sceneVersion: Int, step: String, text: String): FreeLineResult {
		val situation = situations.find(sceneId, step)
		val result = when (val m = situation?.let { matcher.match(it, text, visitorId, sceneId) }) {
			null -> FreeLineResult("unavailable")
			is MatchResult.Matched -> FreeLineResult("matched", matchedChoiceId = m.choiceId)
			is MatchResult.Failed -> FreeLineResult("unavailable")
			MatchResult.NoMatch -> when (val r = writer.write(situation, text, visitorId, sceneId)) {
				is ReactionResult.Reacted -> FreeLineResult("reacted", verdict = r.verdict, heard = r.heard, expression = r.expression, thought = r.thought)
				ReactionResult.OffTopic -> FreeLineResult("off_topic")
				ReactionResult.TooFar -> FreeLineResult("too_far")
				is ReactionResult.Failed -> FreeLineResult("unmatched")
			}
		}
		jdbc.sql(
			"""
			insert into missing_intent (visitor_id, scene_id, scene_version, step, text, matched_choice_id, outcome, reaction_verdict, reaction_heard, reaction_expression, reaction_thought)
			values (:v, :s, :ver, :step, :t, :m, :o, :vd, :h, :e, :th)
			""",
		).param("v", visitorId).param("s", sceneId).param("ver", sceneVersion).param("step", step).param("t", text)
			.param("m", result.matchedChoiceId).param("o", result.outcome).param("vd", result.verdict).param("h", result.heard).param("e", result.expression).param("th", result.thought).update()
		return result
	}
}
