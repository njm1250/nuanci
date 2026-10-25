package com.nuanci.metrics

import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.sql.Timestamp
import java.time.Instant
import java.time.ZoneId

class AdminPeriod(val period: String, now: Instant = Instant.now()) {
	private val today = now.atZone(ZoneId.of("Asia/Seoul")).toLocalDate()
	private val days = when (period) {
		"today" -> 1L
		"7d" -> 7L
		"30d" -> 30L
		"90d" -> 90L
		"all" -> null
		else -> throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid period")
	}
	val start = days?.let { today.minusDays(it - 1).atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant() }
	val end = now
	val chartStart = (start ?: today.minusDays(29).atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant())
	val clause = "e.created_at <= :periodEnd" + if (start == null) "" else " and e.created_at >= :periodStart"
	val params: Map<String, Any> = buildMap {
		put("periodEnd", Timestamp.from(end))
		start?.let { put("periodStart", Timestamp.from(it)) }
	}
}
