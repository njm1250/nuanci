package com.nuanci.push

import com.nuanci.config.NuanciProperties
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

data class PushKey(val publicKey: String?)

data class PushSubscribeRequest(
	val visitorId: UUID,
	@field:Size(min = 10, max = 1000)
	@field:Pattern(regexp = "https://.+")
	val endpoint: String,
	@field:Size(min = 10, max = 200)
	val p256dh: String,
	@field:Size(min = 4, max = 100)
	val auth: String,
	@field:Min(0) @field:Max(23)
	val hour: Int,
)

data class PushUnsubscribeRequest(@field:Size(max = 1000) val endpoint: String)

// 알림 구독. 브라우저가 받은 구독 정보와 사용자가 고른 시각을 저장한다. 같은 브라우저가 다시 구독하면 시각만 바꾸고 다시 켠다
@RestController
@RequestMapping("/api/push")
class PushController(private val jdbc: JdbcClient, private val props: NuanciProperties, private val sender: PushSender) {
	// 브라우저가 구독할 때 쓰는 공개 키. 키가 없으면 null이라 화면이 알림 칸을 띄우지 않는다
	@GetMapping("/key")
	fun key() = PushKey(sender.applicationServerKey())

	@PostMapping("/subscribe")
	@ResponseStatus(HttpStatus.ACCEPTED)
	fun subscribe(@Valid @RequestBody req: PushSubscribeRequest) {
		if (!props.push.enabled) throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "push off")
		jdbc.sql(
			"""
			insert into push_subscription (endpoint, visitor_id, p256dh, auth, hour) values (:e, :v, :p, :a, :h)
			on conflict (endpoint) do update set visitor_id = excluded.visitor_id, p256dh = excluded.p256dh, auth = excluded.auth,
			  hour = excluded.hour, active = true, unopened = 0
			""",
		).param("e", req.endpoint).param("v", req.visitorId).param("p", req.p256dh).param("a", req.auth).param("h", req.hour).update()
	}

	@PostMapping("/unsubscribe")
	@ResponseStatus(HttpStatus.ACCEPTED)
	fun unsubscribe(@Valid @RequestBody req: PushUnsubscribeRequest) {
		jdbc.sql("update push_subscription set active = false where endpoint = :e").param("e", req.endpoint).update()
	}
}
