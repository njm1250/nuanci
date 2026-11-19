package com.nuanci.feedback

import com.nuanci.ai.freeline.FreeLineResult
import com.nuanci.ai.freeline.FreeLineService
import com.nuanci.scene.SceneRepository
import jakarta.validation.Valid
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
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

// "내 말로 해 보기". 보기에 없는 영어를 직접 받아 가장 가까운 보기에 대 보고, 없으면 상대 반응을 쓴다(FreeLineService, ADR 0025·0026).
// 한 방문자가 한 장면에 계속 보내지 못하게 장면당 MAX_PER_SCENE개까지 받는다
@RestController
class MissingIntentController(private val scenes: SceneRepository, private val freeLines: FreeLineService) {
	private val sent = ConcurrentHashMap<String, Int>()

	@PostMapping("/api/missing-intents")
	fun send(@Valid @RequestBody req: MissingIntentRequest): FreeLineResult {
		val text = req.text.trim()
		if (text.length < 2) throw ResponseStatusException(HttpStatus.BAD_REQUEST)
		if (!scenes.existsById(req.sceneId)) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown scene")
		val key = "${req.visitorId}:${req.sceneId}"
		if (sent.merge(key, 1, Int::plus)!! > MAX_PER_SCENE) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)
		return freeLines.handle(req.visitorId, req.sceneId, req.sceneVersion, req.step, text)
	}

	companion object {
		const val MAX_PER_SCENE = 5
	}
}
