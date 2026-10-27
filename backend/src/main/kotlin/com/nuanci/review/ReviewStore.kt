package com.nuanci.review

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.util.UUID

data class ReviewCard(val id: Long, val sceneId: String, val step: String, val choiceId: String, val box: Int)

// 복습 카드 저장소. 처음 고른 답이 O가 아니면 카드를 만들고, 단어장 상자처럼 알았으면 다음 단계로(1일 → 3일 → 7일 뒤), 몰랐으면 1단계로 돌려 다음 날 다시 묻는다.
// 3단계에서 알았으면 익힘으로 둔다
@Repository
class ReviewStore(private val jdbc: JdbcClient) {
	// 이번 선택이 그 사람의 그 질문 첫 선택이고 O가 아니면 카드를 만든다. 이벤트를 저장한 뒤 부른다
	fun recordPick(owner: UUID, visitor: UUID, user: UUID?, sceneId: String, version: Int, step: String, choiceId: String) {
		val picks = jdbc.sql(
			"""
			select count(*) from scene_event
			where type = 'choice_selected' and scene_id = :scene and step = :step and (visitor_id = :visitor or user_id = :user)
			""",
		).param("scene", sceneId).param("step", step).param("visitor", visitor).param("user", user).query(Int::class.java).single()
		if (picks > 1) return
		val verdict = jdbc.sql(
			"""
			select c ->> 'verdict' from scene_version v cross join lateral json_array_elements(v.content -> :step -> 'choices') c
			where v.scene_id = :scene and v.version = :version and c ->> 'id' = :choice
			""",
		).param("scene", sceneId).param("version", version).param("step", step).param("choice", choiceId).query(String::class.java).optional().orElse(null)
		if (verdict !in setOf("meh", "bad")) return
		jdbc.sql(
			"""
			insert into review_card (owner_id, scene_id, step, choice_id, due_at) values (:owner, :scene, :step, :choice, :due)
			on conflict do nothing
			""",
		).param("owner", owner).param("scene", sceneId).param("step", step).param("choice", choiceId)
			.param("due", java.sql.Timestamp.from(Instant.now().plus(STEPS[0]))).update()
	}

	// 지금 물을 차례인 카드(오래 기다린 것부터)와, 아직 남은 카드 수·익힌 카드 수
	fun due(owner: UUID, limit: Int): List<ReviewCard> =
		jdbc.sql(
			"""
			select id, scene_id, step, choice_id, box from review_card
			where owner_id = :owner and mastered_at is null and due_at <= now()
			order by due_at, id limit :limit
			""",
		).param("owner", owner).param("limit", limit)
			.query { rs, _ -> ReviewCard(rs.getLong("id"), rs.getString("scene_id"), rs.getString("step"), rs.getString("choice_id"), rs.getInt("box")) }.list()

	fun counts(owner: UUID): Pair<Int, Int> =
		jdbc.sql("select count(*) filter (where mastered_at is null and due_at <= now()) as due, count(*) filter (where mastered_at is not null) as mastered from review_card where owner_id = :owner")
			.param("owner", owner).query { rs, _ -> rs.getInt("due") to rs.getInt("mastered") }.single()

	// 알았는지 기록하고 다음에 물을 때를 정한다. 주인의 카드가 아니면 false
	fun answer(owner: UUID, id: Long, knew: Boolean): Boolean {
		val box = jdbc.sql("select box from review_card where id = :id and owner_id = :owner and mastered_at is null")
			.param("id", id).param("owner", owner).query(Int::class.java).optional().orElse(null) ?: return false
		val now = Instant.now()
		val next = if (knew) box + 1 else 1
		val mastered = knew && box >= STEPS.size
		jdbc.sql("update review_card set box = :box, due_at = :due, reviewed_at = :now, mastered_at = :mastered where id = :id")
			.param("box", next.coerceAtMost(STEPS.size))
			.param("due", java.sql.Timestamp.from(now.plus(STEPS[(next - 1).coerceAtMost(STEPS.size - 1)])))
			.param("now", java.sql.Timestamp.from(now))
			.param("mastered", if (mastered) java.sql.Timestamp.from(now) else null)
			.param("id", id).update()
		return true
	}

	// 로그인하면 이 기기에서 방문자로 쌓은 카드를 계정으로 옮긴다. 계정에 같은 질문 카드가 있으면 계정 것을 둔다
	@Transactional
	fun mergeVisitor(visitor: UUID, user: UUID) {
		jdbc.sql(
			"""
			insert into review_card (owner_id, scene_id, step, choice_id, box, due_at, reviewed_at, mastered_at, created_at)
			select :user, scene_id, step, choice_id, box, due_at, reviewed_at, mastered_at, created_at from review_card where owner_id = :visitor
			on conflict do nothing
			""",
		).param("user", user).param("visitor", visitor).update()
		jdbc.sql("delete from review_card where owner_id = :visitor").param("visitor", visitor).update()
	}

	fun deleteOwner(owner: UUID) {
		jdbc.sql("delete from review_card where owner_id = :owner").param("owner", owner).update()
	}

	companion object {
		// 상자 단계마다 다음에 다시 물을 때까지의 간격
		val STEPS: List<Duration> = listOf(Duration.ofDays(1), Duration.ofDays(3), Duration.ofDays(7))
	}
}
