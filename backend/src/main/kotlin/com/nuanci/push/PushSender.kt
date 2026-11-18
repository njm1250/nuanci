package com.nuanci.push

import com.interaso.webpush.VapidKeys
import com.interaso.webpush.WebPush
import com.interaso.webpush.WebPushService
import com.nuanci.config.NuanciProperties
import com.nuanci.scene.SceneCatalog
import org.slf4j.LoggerFactory
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.Base64
import java.util.UUID

// 매시 정각, 그 시각을 고른 구독자에게 다음 장면 상대의 첫마디를 보낸다.
// 오늘(서울 시간) 이미 장면을 끝냈거나 오늘 이미 보냈으면 건너뛴다. 연달아 안 연 알림이 MAX_UNOPENED개면 더 보내지 않는다.
// 다음 장면은 이 방문자가 끝내지 않은 장면 중 목차 순서로 첫 번째(개발자 묶음 제외)다
@Service
class PushSender(
	private val props: NuanciProperties,
	private val jdbc: JdbcClient,
	private val catalog: SceneCatalog,
	private val mapper: JsonMapper,
) {
	private val log = LoggerFactory.getLogger(javaClass)
	private val service by lazy {
		if (props.push.enabled) WebPushService(props.push.subject, VapidKeys.create(props.push.publicKey, props.push.privateKey)) else null
	}

	fun applicationServerKey(): String? =
		service?.let { Base64.getUrlEncoder().withoutPadding().encodeToString(it.vapidKeys.applicationServerKey) }

	private data class Due(val endpoint: String, val visitorId: UUID, val p256dh: String, val auth: String)

	@Scheduled(cron = "0 0 * * * *", zone = "Asia/Seoul")
	fun sendDue() {
		val push = service ?: return
		val hour = ZonedDateTime.now(SEOUL).hour
		val due = jdbc.sql(
			"""
			select endpoint, visitor_id, p256dh, auth from push_subscription s
			where active and hour = :h and unopened < :max
			  and (last_sent_at is null or (last_sent_at at time zone 'Asia/Seoul')::date < (now() at time zone 'Asia/Seoul')::date)
			  and not exists (
			    select 1 from scene_event e where e.visitor_id = s.visitor_id and e.type = 'scene_completed'
			      and (e.created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date)
			""",
		).param("h", hour).param("max", MAX_UNOPENED)
			.query { rs, _ -> Due(rs.getString(1), rs.getObject(2, UUID::class.java), rs.getString(3), rs.getString(4)) }.list()
		due.forEach { send(push, it) }
	}

	private fun send(push: WebPushService, s: Due) {
		val payload = message(s.visitorId) ?: return
		val state = runCatching { push.send(payload, s.endpoint, s.p256dh, s.auth, TTL_SECONDS, null, WebPush.Urgency.Normal) }
			.onFailure { log.warn("알림 보내기 실패: {}", it.message) }.getOrNull() ?: return
		if (state == WebPush.SubscriptionState.EXPIRED) {
			jdbc.sql("update push_subscription set active = false where endpoint = :e").param("e", s.endpoint).update()
			return
		}
		jdbc.sql("update push_subscription set last_sent_at = now(), unopened = unopened + 1 where endpoint = :e").param("e", s.endpoint).update()
	}

	// 알림 한 통. 다음 장면 상대가 고르기 직전에 하는 말을 그대로 보내서, 알림을 누르면 그 말에 답하는 자리로 바로 간다
	private fun message(visitorId: UUID): String? {
		val done = jdbc.sql("select distinct scene_id from scene_event where visitor_id = :v and type = 'scene_completed'")
			.param("v", visitorId).query(String::class.java).list().toSet()
		val next = catalog.current().entries.firstOrNull { it.category != "dev" && it.id !in done && it.partnerLine.isNotBlank() } ?: return null
		val who = next.partnerName.ifBlank { next.relation }
		return mapper.writeValueAsString(
			mapOf(
				"title" to "$who: \"${next.partnerLine}\"",
				"body" to "${next.title} · 뭐라고 답할래?",
				"url" to "/scenes/${next.number}",
				"visitorId" to visitorId.toString(),
			),
		)
	}

	companion object {
		val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")
		const val MAX_UNOPENED = 3
		// 하루 안에 못 받으면 버린다. 어제 알림이 오늘 늦게 도착하면 오히려 귀찮다
		const val TTL_SECONDS = 60 * 60 * 12
	}
}
