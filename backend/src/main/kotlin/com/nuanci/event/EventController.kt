package com.nuanci.event

import com.nuanci.account.AccountStore
import com.nuanci.account.SESSION_COOKIE
import org.springframework.web.bind.annotation.CookieValue
import com.nuanci.review.ReviewStore
import com.nuanci.scene.SceneRepository
import jakarta.validation.Valid
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

// 영어 사고 유형 테스트 이벤트. 장면 없이 받고, 결과 유형은 choiceId에 담는다. 문제에 답할 때만 그 문제의 장면·상황을 같이 보낸다
// AI가 화면을 확인하러 들어올 때 붙이는 utm_source 값
const val AI_SOURCE = "ai"

const val TEST_EVENTS = "test_viewed|test_started|test_answered|test_completed|test_shared|test_result_viewed"

// 장면 없이 받는 이벤트. page_engaged는 화면을 처음 누르거나 스크롤한 순간이라 홈에서도 장면에서도 온다
private val SCENELESS = setOf("home_viewed", "page_engaged")

data class EventRequest(
	@field:Pattern(regexp = "home_viewed|page_engaged|scene_viewed|lead_finished|choice_selected|alternative_viewed|scene_completed|wrap_viewed|next_clicked|share_link_copied|reward_shown|reward_equipped|$TEST_EVENTS")
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
	@field:Size(max = 100)
	val utmSource: String? = null,
	@field:Size(max = 100)
	val utmMedium: String? = null,
	@field:Size(max = 100)
	val utmCampaign: String? = null,
	@field:Size(max = 255)
	val referrer: String? = null,
	// 브라우저가 자동화 도구로 움직이고 있는지(navigator.webdriver)
	val automated: Boolean? = null,
)

@RestController
@RequestMapping("/api/events")
class EventController(
	private val events: SceneEventRepository,
	private val scenes: SceneRepository,
	private val accounts: AccountStore,
	private val jdbc: JdbcClient,
	private val reviews: ReviewStore,
) {
	@PostMapping
	@ResponseStatus(HttpStatus.ACCEPTED)
	fun record(
		@Valid @RequestBody req: EventRequest,
		@CookieValue(SESSION_COOKIE, required = false) token: String?,
		@RequestHeader(HttpHeaders.USER_AGENT, required = false) userAgent: String?,
	) {
		val account = accounts.account(token)
		// 홈 방문, 화면 반응, 테스트 이벤트는 장면 없이 받는다. 나머지는 장면·버전·시도가 모두 있어야 한다
		val test = req.type.startsWith("test_")
		if (req.type !in SCENELESS && !test) {
			if (req.sceneId == null || req.sceneVersion == null || req.attemptId == null) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "scene required")
		}
		if (req.sceneId != null && !scenes.existsById(req.sceneId)) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown scene")
		events.save(
			SceneEvent(req.type, req.sceneId, req.sceneVersion, req.attemptId, req.visitorId, req.step, req.choiceId, req.entry, userId = account?.id, authState = if (account == null) "guest" else "member"),
		)
		// 그 질문의 첫 선택이 O가 아니면 다음에 다시 물을 복습 카드를 만든다
		if (req.type == "choice_selected" && req.sceneId != null && req.sceneVersion != null && req.step != null && req.choiceId != null) {
			reviews.recordPick(account?.id ?: req.visitorId, req.visitorId, account?.id, req.sceneId, req.sceneVersion, req.step, req.choiceId)
		}
		// 처음 들어온 경로만 남긴다. 나중에 다른 링크로 다시 와도 덮어쓰지 않는다
		if (req.utmSource != null || req.referrer != null) {
			jdbc.sql("insert into visitor_source (visitor_id, source, medium, campaign, referrer) values (:v, :s, :m, :c, :r) on conflict do nothing")
				.param("v", req.visitorId)
				.param("s", req.utmSource?.lowercase())
				.param("m", req.utmMedium?.lowercase())
				.param("c", req.utmCampaign?.lowercase())
				.param("r", req.referrer?.lowercase())
				.update()
		}
		// 처음 본 기기 종류를 남긴다. 나중에라도 봇 신호가 오면 봇으로 바꾼다
		jdbc.sql(
			"""
			insert into visitor_client (visitor_id, client, user_agent) values (:v, :c, :ua)
			on conflict (visitor_id) do update set client = excluded.client, user_agent = excluded.user_agent
			where excluded.client = '${ClientKind.BOT}' and visitor_client.client <> '${ClientKind.BOT}'
			""",
		).param("v", req.visitorId).param("c", ClientKind.of(userAgent, req.automated == true)).param("ua", userAgent?.take(300)).update()
		// utm_source=ai로 들어온 방문은 AI가 화면을 확인한 것이라 내부 방문자로 돌려 이용 지표에서 뺀다
		if (req.utmSource?.lowercase() == AI_SOURCE) {
			jdbc.sql("insert into internal_visitor (visitor_id) values (:v) on conflict do nothing").param("v", req.visitorId).update()
		}
	}
}
