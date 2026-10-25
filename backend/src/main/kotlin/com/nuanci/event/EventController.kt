package com.nuanci.event

import com.nuanci.account.AccountStore
import com.nuanci.account.SESSION_COOKIE
import org.springframework.web.bind.annotation.CookieValue
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

// 영어 사고 유형 테스트 이벤트. 장면 없이 받고, 결과 유형은 choiceId에 담는다. 문제에 답할 때만 그 문제의 장면·상황을 같이 보낸다
const val TEST_EVENTS = "test_viewed|test_started|test_answered|test_completed|test_shared|test_result_viewed"

data class EventRequest(
	@field:Pattern(regexp = "home_viewed|scene_viewed|choice_selected|alternative_viewed|scene_completed|wrap_viewed|next_clicked|share_link_copied|reward_shown|reward_equipped|$TEST_EVENTS")
	val type: String,
	@field:Size(min = 1, max = 100)
	val sceneId: String? = null,
	@field:Positive
	val sceneVersion: Int? = null,
	val attemptId: UUID? = null,
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
	private val accounts: AccountStore,
) {
	@PostMapping
	@ResponseStatus(HttpStatus.ACCEPTED)
	fun record(@Valid @RequestBody req: EventRequest, @CookieValue(SESSION_COOKIE, required = false) token: String?) {
		val account = accounts.account(token)
		// 홈 방문과 테스트 이벤트는 장면 없이 받는다. 나머지는 장면·버전·시도가 모두 있어야 한다
		val test = req.type.startsWith("test_")
		if (req.type != "home_viewed" && !test) {
			if (req.sceneId == null || req.sceneVersion == null || req.attemptId == null) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "scene required")
		}
		if (req.sceneId != null && !scenes.existsById(req.sceneId)) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown scene")
		events.save(
			SceneEvent(req.type, req.sceneId, req.sceneVersion, req.attemptId, req.visitorId, req.step, req.choiceId, req.entry, userId = account?.id, authState = if (account == null) "guest" else "member"),
		)
	}
}
