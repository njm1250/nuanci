package com.nuanci.feedback

import com.nuanci.scene.SceneRepository
import jakarta.validation.Valid
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.ResponseStatus
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

// "하려던 말이 없어요". 보기 셋 중에 내 마음에 맞는 말이 없을 때 하려던 말을 한국어 한 줄로 받는다.
// 모은 말은 읽기 전용 조회로 장면별로 묶어 보고, 같은 의도가 겹치면 보기를 고친다. 한 방문자가 한 장면에 계속 보내지 못하게 장면당 3개까지 받는다
@RestController
class MissingIntentController(private val jdbc: JdbcClient, private val scenes: SceneRepository) {
	private val sent = ConcurrentHashMap<String, Int>()

	@PostMapping("/api/missing-intents")
	@ResponseStatus(HttpStatus.ACCEPTED)
	fun send(@Valid @RequestBody req: MissingIntentRequest) {
		val text = req.text.trim()
		if (text.length < 2) throw ResponseStatusException(HttpStatus.BAD_REQUEST)
		if (!scenes.existsById(req.sceneId)) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown scene")
		val key = "${req.visitorId}:${req.sceneId}"
		if (sent.merge(key, 1, Int::plus)!! > MAX_PER_SCENE) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)
		jdbc.sql("insert into missing_intent (visitor_id, scene_id, scene_version, step, text) values (:v, :s, :ver, :step, :t)")
			.param("v", req.visitorId).param("s", req.sceneId).param("ver", req.sceneVersion).param("step", req.step).param("t", text).update()
	}

	companion object {
		const val MAX_PER_SCENE = 3
	}
}
