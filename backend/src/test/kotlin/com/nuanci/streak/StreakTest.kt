package com.nuanci.streak

import org.junit.jupiter.api.Test
import java.time.LocalDate
import kotlin.test.assertEquals

class StreakTest {
	private val today = LocalDate.of(2026, 10, 24)
	private fun days(vararg back: Long) = back.map { today.minusDays(it) }.toSet()

	@Test
	fun `오늘까지 이어진 날을 센다`() = assertEquals(Streak(3, 3, true), StreakStore.compute(days(0, 1, 2), today))

	@Test
	fun `오늘 아직 안 했어도 어제까지 이어졌으면 끊기지 않는다`() = assertEquals(Streak(2, 2, false), StreakStore.compute(days(1, 2), today))

	@Test
	fun `하루를 건너뛰면 끊기고 가장 긴 기록은 남는다`() = assertEquals(Streak(1, 4, true), StreakStore.compute(days(0, 3, 4, 5, 6), today))

	@Test
	fun `어제도 안 했으면 0이다`() = assertEquals(Streak(0, 1, false), StreakStore.compute(days(2), today))
}
