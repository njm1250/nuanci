package com.nuanci.review

import com.nuanci.account.AccountStore
import com.nuanci.account.SESSION_COOKIE
import com.nuanci.scene.SceneRepository
import com.nuanci.scene.SceneStatus
import com.nuanci.scene.SceneStore
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

data class ReviewLine(val line: String, val meaning: String)

// 복습 카드 한 장: 그 질문의 상황(상대 말, 하고 싶던 말), 지난번 내가 처음 고른 말, 자연스러운 말과 이유
data class ReviewCardView(
	val id: Long,
	val sceneNumber: Int,
	val title: String,
	val partnerName: String,
	val partnerLine: String,
	val intent: String,
	val mine: ReviewLine,
	val right: ReviewLine,
	val why: String,
)

// due는 지금 물을 차례인 카드 수(보여 주는 카드보다 많을 수 있다), mastered는 다 익힌 카드 수
data class ReviewResponse(val cards: List<ReviewCardView>, val due: Int, val mastered: Int)

data class ReviewAnswerRequest(val visitorId: UUID? = null, val knew: Boolean)

// 오늘의 복습. 로그인했으면 계정, 아니면 이 기기의 방문자 id가 주인이다
@RestController
@RequestMapping("/api/review")
class ReviewController(
	private val reviews: ReviewStore,
	private val accounts: AccountStore,
	private val scenes: SceneRepository,
	private val store: SceneStore,
) {
	// 지금 물을 카드를 최대 두 장 준다. 로그인한 상태면 이 기기에서 방문자로 쌓은 카드를 먼저 계정으로 옮긴다
	@GetMapping
	fun today(@CookieValue(SESSION_COOKIE, required = false) token: String?, @RequestParam(required = false) visitorId: UUID?): ReviewResponse {
		val account = accounts.account(token)
		if (account != null && visitorId != null) reviews.mergeVisitor(visitorId, account.id)
		val owner = account?.id ?: visitorId ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "visitor required")
		val cards = reviews.due(owner, CARDS_PER_DAY).mapNotNull(::view)
		val (due, mastered) = reviews.counts(owner)
		return ReviewResponse(cards, due, mastered)
	}

	@PostMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun answer(@CookieValue(SESSION_COOKIE, required = false) token: String?, @PathVariable id: Long, @RequestBody req: ReviewAnswerRequest) {
		val owner = accounts.account(token)?.id ?: req.visitorId ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "visitor required")
		if (!reviews.answer(owner, id, req.knew)) throw ResponseStatusException(HttpStatus.NOT_FOUND)
	}

	// 장면 지금 버전의 내용으로 카드를 채운다. 장면을 숨겼거나 고쳐서 그 선택지가 없어졌으면 보여 주지 않는다
	private fun view(card: ReviewCard): ReviewCardView? {
		val scene = scenes.findById(card.sceneId).orElse(null)?.takeIf { it.status == SceneStatus.PUBLISHED } ?: return null
		val content = store.content(scene)
		val situation = content.path(card.step)
		val choices = situation.path("choices")
		val mine = choices.firstOrNull { it.path("id").asString() == card.choiceId } ?: return null
		val right = choices.firstOrNull { it.path("verdict").asString() == "good" } ?: return null
		return ReviewCardView(
			id = card.id,
			sceneNumber = scene.number,
			title = scene.title,
			partnerName = content.path("partnerName").asString(),
			partnerLine = situation.path("partnerLine").asString(),
			intent = situation.path("intent").asString(),
			mine = ReviewLine(mine.path("line").asString(), mine.path("meaning").asString()),
			right = ReviewLine(right.path("line").asString(), right.path("meaning").asString()),
			why = right.path("why").asString(),
		)
	}

	companion object {
		// 하루에 묻는 카드 수. 1분 안에 끝나게 두 장으로 둔다
		const val CARDS_PER_DAY = 2
	}
}
