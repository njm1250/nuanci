package com.nuanci.feedback

import com.nuanci.ai.IntentMatch
import com.nuanci.ai.IntentMatcher
import com.nuanci.scene.SceneRepository
import jakarta.validation.Valid
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class MissingIntentRequest(
	val visitorId: UUID,
	@field:Size(min = 1, max = 100)
	val sceneId: String,
	@field:Positive
	val sceneVersion: Int,
	@field:Pattern(regexp = "base|followUp")
	val step: String,
	@field:Size(max = 200)
	val text: String,
)

data class MissingIntentResponse(val matchedChoiceId: String?)

// "내가 하려던 영어가 없어요". 보기에 없는 영어를 직접 받아, 원어민에게 거의 같게 들리는 보기가 있으면 그 보기를 알려 준다(IntentMatcher).
// 대지 못한 말은 모아 두고, 같은 말이 여러 사람에게서 나오면 장면에 보기로 넣는다. 한 방문자가 한 장면에 계속 보내지 못하게 장면당 3개까지 받는다
@RestController
class MissingIntentController(private val jdbc: JdbcClient, private val scenes: SceneRepository, private val matcher: IntentMatcher) {
	private val sent = ConcurrentHashMap<String, Int>()

	@PostMapping("/api/missing-intents")
	fun send(@Valid @RequestBody req: MissingIntentRequest): MissingIntentResponse {
		val text = req.text.trim()
		if (text.length < 2) throw ResponseStatusException(HttpStatus.BAD_REQUEST)
		if (!scenes.existsById(req.sceneId)) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown scene")
		val key = "${req.visitorId}:${req.sceneId}"
		if (sent.merge(key, 1, Int::plus)!! > MAX_PER_SCENE) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)
		val match = runCatching { matcher.match(req.sceneId, req.step, text) }.getOrDefault(IntentMatcher.NONE)
		jdbc.sql(
			"""
			insert into missing_intent (visitor_id, scene_id, scene_version, step, text, matched_choice_id, match_confidence)
			values (:v, :s, :ver, :step, :t, :m, :c)
			""",
		).param("v", req.visitorId).param("s", req.sceneId).param("ver", req.sceneVersion).param("step", req.step).param("t", text)
			.param("m", match.choiceId).param("c", match.confidence).update()
		return MissingIntentResponse(match.choiceId)
	}

	companion object {
		const val MAX_PER_SCENE = 3
	}
}
