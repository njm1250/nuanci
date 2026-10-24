package com.nuanci.streak

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

// current는 오늘 또는 어제까지 이어진 날 수, best는 가장 길게 이어졌던 날 수. today는 오늘 이미 했는지다
data class Streak(val current: Int, val best: Int, val today: Boolean)

// 연속으로 장면을 한 날을 센다. 하루의 기준은 한국 시간이다
@Service
class StreakStore(private val jdbc: JdbcClient) {
	fun today(): LocalDate = LocalDate.now(ZONE)

	// 오늘 한 것으로 남긴다. 오늘 처음이면 true
	fun record(owner: UUID): Boolean =
		jdbc.sql("insert into activity_day (owner_id, day) values (:owner, :day) on conflict do nothing")
			.param("owner", owner).param("day", today()).update() > 0

	fun streak(owner: UUID): Streak {
		val days = jdbc.sql("select day from activity_day where owner_id = :owner order by day desc")
			.param("owner", owner).query(LocalDate::class.java).list()
		return compute(days.filterNotNull().toSet(), today())
	}

	@Transactional
	fun mergeVisitor(visitor: UUID, user: UUID) {
		jdbc.sql("insert into activity_day (owner_id, day) select :user, day from activity_day where owner_id = :visitor on conflict do nothing")
			.param("user", user).param("visitor", visitor).update()
		jdbc.sql("delete from activity_day where owner_id = :visitor").param("visitor", visitor).update()
	}

	fun deleteOwner(owner: UUID) {
		jdbc.sql("delete from activity_day where owner_id = :owner").param("owner", owner).update()
	}

	companion object {
		val ZONE: ZoneId = ZoneId.of("Asia/Seoul")

		// 이름 옆에 달 수 있는 뱃지. 가장 길게 이어졌던 날 수가 이만큼이면 얻는다
		val BADGES = listOf(3, 7, 10, 30, 50, 100, 365)

		// 오늘 했으면 오늘부터, 아직 안 했으면 어제부터 거꾸로 이어진 날을 센다. 어제도 안 했으면 끊긴 것이다
		fun compute(days: Set<LocalDate>, today: LocalDate): Streak {
			val did = today in days
			var cursor = if (did) today else today.minusDays(1)
			var current = 0
			while (cursor in days) {
				current++
				cursor = cursor.minusDays(1)
			}
			var best = 0
			for (day in days) {
				if (day.minusDays(1) in days) continue
				var length = 0
				var d = day
				while (d in days) {
					length++
					d = d.plusDays(1)
				}
				best = maxOf(best, length)
			}
			return Streak(current, best, did)
		}
	}
}
