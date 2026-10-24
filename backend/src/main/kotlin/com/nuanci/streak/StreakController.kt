package com.nuanci.streak

import com.nuanci.account.AccountStore
import com.nuanci.account.SESSION_COOKIE
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

data class StreakRequest(val visitorId: UUID? = null)

// week는 오늘을 포함한 최근 7일(오래된 날부터). extended는 이번 요청으로 오늘 처음 이어졌는지, newBadge는 이번에 새로 얻은 뱃지(며칠짜리)다
data class StreakResponse(
	val current: Int,
	val best: Int,
	val today: Boolean,
	val week: List<Boolean>,
	val badges: List<Int>,
	val nextBadge: Int?,
	val extended: Boolean = false,
	val newBadge: Int? = null,
)

// 연속 기록. 로그인했으면 계정, 아니면 이 기기의 방문자 id가 주인이다
@RestController
@RequestMapping("/api/streak")
class StreakController(private val streaks: StreakStore, private val accounts: AccountStore) {
	// 지금 기록을 돌려준다. 로그인한 상태면 이 기기에서 방문자로 쌓은 날을 계정으로 옮긴다
	@PostMapping("/sync")
	fun sync(@CookieValue(SESSION_COOKIE, required = false) token: String?, @RequestBody req: StreakRequest): StreakResponse {
		val account = accounts.account(token)
		if (account != null) req.visitorId?.let { streaks.mergeVisitor(it, account.id) }
		val owner = owner(account?.id, req.visitorId)
		return view(streaks.streak(owner), streaks.week(owner))
	}

	// 장면을 끝낼 때마다 부른다. 다시 한 장면도 그날 한 것으로 친다
	@PostMapping("/play")
	fun play(@CookieValue(SESSION_COOKIE, required = false) token: String?, @RequestBody req: StreakRequest): StreakResponse {
		val owner = owner(accounts.account(token)?.id, req.visitorId)
		val before = streaks.streak(owner)
		val extended = streaks.record(owner)
		val after = streaks.streak(owner)
		val newBadge = StreakStore.BADGES.lastOrNull { it in (before.best + 1)..after.best }
		return view(after, streaks.week(owner)).copy(extended = extended, newBadge = newBadge)
	}

	private fun owner(user: UUID?, visitor: UUID?) = user ?: visitor ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "visitor required")

	private fun view(s: Streak, week: List<Boolean>) =
		StreakResponse(s.current, s.best, s.today, week, StreakStore.BADGES.filter { it <= s.best }, StreakStore.BADGES.firstOrNull { it > s.best })
}
