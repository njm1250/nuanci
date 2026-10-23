package com.nuanci.event

import com.nuanci.scene.SceneRepository
import jakarta.validation.Valid
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

data class EventRequest(
	@field:Pattern(regexp = "scene_viewed|choice_selected|alternative_viewed|scene_completed|share_link_copied")
	val type: String,
	@field:Size(min = 1, max = 100)
	val sceneId: String,
	@field:Positive
	val sceneVersion: Int,
	val attemptId: UUID,
	val visitorId: UUID,
	@field:Pattern(regexp = "base|followUp")
	val step: String? = null,
	@field:Size(max = 100)
	val choiceId: String? = null,
	@field:Pattern(regexp = "home|next|share|direct")
	val entry: String? = null,
)

@RestController
@RequestMapping("/api/events")
class EventController(
	private val events: SceneEventRepository,
	private val scenes: SceneRepository,
) {
	@PostMapping
	@ResponseStatus(HttpStatus.ACCEPTED)
	fun record(@Valid @RequestBody req: EventRequest) {
		if (!scenes.existsById(req.sceneId)) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown scene")
		events.save(
			SceneEvent(req.type, req.sceneId, req.sceneVersion, req.attemptId, req.visitorId, req.step, req.choiceId, req.entry),
		)
	}
}
