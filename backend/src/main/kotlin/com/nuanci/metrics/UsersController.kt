package com.nuanci.metrics

import com.nuanci.admin.AdminSessions
import com.nuanci.reward.RewardCatalog
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.sql.ResultSet
import java.util.UUID

data class OperatorUser(
	val id: UUID, val name: String?, val email: String?, val createdAt: String?, val lastAt: String?,
	val events: Int, val attempts: Int, val completedScenes: Int, val activityDays: Int, val browsers: Int,
	val internal: Boolean, val source: String?, val guestEvents: Int, val memberEvents: Int, val unknownEvents: Int,
)
data class UserDirectory(val rows: List<OperatorUser>, val total: Int, val active7: Int, val noCompletion: Int, val returning: Int, val page: Int, val pageSize: Int)
data class UserEvent(
	val id: Long, val type: String, val createdAt: String, val sceneId: String?, val sceneTitle: String?,
	val sceneVersion: Int?, val attemptId: String?, val visitorId: UUID, val userId: UUID?, val accountName: String?,
	val authState: String, val step: String?, val choiceId: String?, val entry: String?,
	val line: String?, val verdict: String?, val reaction: String?, val internal: Boolean,
)

// 계정은 이벤트가 발생했을 때 저장된 user_id로만 묶는다. 기기의 마지막 로그인 계정으로 과거 기록을 소급하지 않는다.
@RestController
@RequestMapping("/api/admin/users")
class UsersController(private val jdbc: JdbcClient, private val sessions: AdminSessions) {
	@GetMapping
	fun list(
		@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?,
		@RequestParam(defaultValue = "accounts") kind: String,
		@RequestParam(defaultValue = "") q: String,
		@RequestParam(defaultValue = "all") activity: String,
		@RequestParam(defaultValue = "recent") sort: String,
		@RequestParam(defaultValue = "false") includeInternal: Boolean,
		@RequestParam(defaultValue = "1") page: Int,
	): UserDirectory {
		sessions.require(auth)
		validateKind(kind)
		if (q.length > 200 || page !in 1..100000) badRequest()
		val activityFilter = when (activity) {
			"all" -> "true"
			"active7" -> "last_at >= now() - interval '7 days'"
			"inactive7" -> "last_at is null or last_at < now() - interval '7 days'"
			"no_completion" -> "attempts > 0 and completed_scenes = 0"
			"returning" -> "activity_days >= 2"
			else -> badRequest()
		}
		val order = when (sort) {
			"recent" -> "last_at desc nulls last"
			"created" -> "created_at desc nulls last"
			"completed" -> "completed_scenes desc"
			"events" -> "events desc"
			else -> badRequest()
		}
		val cte = directorySql(kind, includeInternal)
		val where = "(:internal or not internal) and position(lower(:q) in lower(concat_ws(' ', id::text, name, email, source))) > 0 and ($activityFilter)"
		fun query(sql: String) = jdbc.sql("$cte $sql").param("internal", includeInternal).param("q", q.trim())
		val counts = query("""
			select count(*) as total, count(*) filter (where last_at >= now() - interval '7 days') as active,
				count(*) filter (where attempts > 0 and completed_scenes = 0) as incomplete,
				count(*) filter (where activity_days >= 2) as returning
			from directory where $where
		""").query { rs, _ -> listOf(rs.getInt("total"), rs.getInt("active"), rs.getInt("incomplete"), rs.getInt("returning")) }.single()
		val lastPage = maxOf(1, (counts[0] + 49) / 50)
		val current = minOf(page, lastPage)
		val rows = query("select * from directory where $where order by $order, id limit 50 offset :offset")
			.param("offset", (current - 1) * 50).query { rs, _ -> user(rs) }.list()
		return UserDirectory(rows, counts[0], counts[1], counts[2], counts[3], current, 50)
	}

	@GetMapping("/{kind}/{id}")
	fun detail(
		@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?,
		@PathVariable kind: String, @PathVariable id: UUID,
		@RequestParam(required = false) before: Long?,
		@RequestParam(defaultValue = "all") event: String,
	): Map<String, Any?> {
		sessions.require(auth)
		validateKind(kind)
		val identity = if (kind == "accounts") "e.user_id = :id" else "e.visitor_id = :id"
		val user = jdbc.sql("${directorySql(kind, true, targeted = true)} select * from directory where id = :id")
			.param("id", id).query { rs, _ -> user(rs) }.optional().orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
		val eventFilter = when (event) {
			"all" -> "true"
			"choices" -> "e.type in ('choice_selected', 'alternative_viewed')"
			"progress" -> "e.type in ('scene_viewed', 'scene_completed', 'wrap_viewed', 'next_clicked', 'test_started', 'test_completed')"
			else -> badRequest()
		}
		val anchor = before?.let {
			if (it <= 0) badRequest()
			jdbc.sql("select e.created_at from scene_event e where $identity and e.id = :before")
				.param("id", id).param("before", it).query(java.sql.Timestamp::class.java).optional()
				.orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid cursor") }
		}
		val events = jdbc.sql("""
			select e.*, s.title, u.name as account_name, choice.value->>'line' as line,
				choice.value->>'verdict' as verdict, choice.value->>'reaction' as reaction,
				exists(select 1 from internal_visitor i where i.visitor_id = e.visitor_id) as internal
			from scene_event e
			left join scene s on s.id = e.scene_id
			left join app_user u on u.id = e.user_id
			left join scene_version v on v.scene_id = e.scene_id and v.version = e.scene_version
			left join lateral (
				select c.value from json_array_elements(v.content -> e.step -> 'choices') c
				where c.value->>'id' = e.choice_id limit 1
			) choice on true
			where $identity and $eventFilter ${if (anchor == null) "" else "and (e.created_at, e.id) < (:anchor, :before)"}
			order by e.created_at desc, e.id desc limit 51
		""").param("id", id).params(if (anchor == null) emptyMap() else mapOf("anchor" to anchor, "before" to before))
			.query { rs, _ -> UserEvent(
				rs.getLong("id"), rs.getString("type"), rs.instant("created_at")!!, rs.getString("scene_id"), rs.getString("title"),
				rs.getObject("scene_version") as Int?, rs.getString("attempt_id"), rs.getObject("visitor_id", UUID::class.java),
				rs.getObject("user_id", UUID::class.java), rs.getString("account_name"), rs.getString("auth_state"),
				rs.getString("step"), rs.getString("choice_id"), rs.getString("entry"), rs.getString("line"),
				rs.getString("verdict"), rs.getString("reaction"), rs.getBoolean("internal"),
			) }.list()
		val attempts = jdbc.sql("""
			select e.attempt_id, e.scene_id, s.title, min(e.created_at) as started_at, max(e.created_at) as last_at,
				bool_or(e.type = 'scene_completed') as completed,
				count(*) filter (where e.type = 'choice_selected') as choices,
				bool_or(e.type = 'wrap_viewed') as wrapped
			from scene_event e left join scene s on s.id = e.scene_id
			where $identity and e.attempt_id is not null
			group by e.attempt_id, e.scene_id, s.title order by last_at desc, e.attempt_id limit 15
		""").param("id", id).query { rs, _ -> mapOf(
			"id" to rs.getString("attempt_id"), "sceneId" to rs.getString("scene_id"), "title" to rs.getString("title"),
			"startedAt" to rs.instant("started_at"), "lastAt" to rs.instant("last_at"), "completed" to rs.getBoolean("completed"),
			"choices" to rs.getInt("choices"), "wrapped" to rs.getBoolean("wrapped"),
		) }.list()
		val connections = jdbc.sql(if (kind == "accounts") """
			select x.visitor_id, min(x.first_at) as first_at, max(x.last_at) as last_at, sum(x.events) as events,
				bool_or(x.latest_link) as latest_link, coalesce(vs.source, vs.referrer) as source, vs.medium, vs.campaign,
				exists(select 1 from internal_visitor i where i.visitor_id = x.visitor_id) as internal
			from (
				select e.visitor_id, min(e.created_at) as first_at, max(e.created_at) as last_at, count(*) as events, false as latest_link
				from scene_event e where e.user_id = :id group by e.visitor_id
				union all
				select uv.visitor_id, null::timestamptz, null::timestamptz, 0, true from user_visitor uv where uv.user_id = :id
			) x left join visitor_source vs on vs.visitor_id = x.visitor_id
			group by x.visitor_id, vs.source, vs.referrer, vs.medium, vs.campaign order by last_at desc nulls last limit 100
		""" else """
			select u.id as visitor_id, u.name, u.email, min(e.created_at) as first_at, max(e.created_at) as last_at, count(e.id) as events,
				exists(select 1 from user_visitor uv where uv.visitor_id = :id and uv.user_id = u.id) as latest_link,
				null::text as source, null::text as medium, null::text as campaign, false as internal
			from app_user u left join scene_event e on e.user_id = u.id and e.visitor_id = :id
			where e.id is not null or exists(select 1 from user_visitor uv where uv.visitor_id = :id and uv.user_id = u.id)
			group by u.id order by last_at desc nulls last limit 100
		""").param("id", id).query { rs, _ -> mapOf(
			"id" to rs.getString("visitor_id"), "name" to if (kind == "browsers") rs.getString("name") else null,
			"email" to if (kind == "browsers") rs.getString("email") else null,
			"firstAt" to rs.instant("first_at"), "lastAt" to rs.instant("last_at"), "events" to rs.getInt("events"),
			"latestLink" to rs.getBoolean("latest_link"), "source" to rs.getString("source"), "medium" to rs.getString("medium"),
			"campaign" to rs.getString("campaign"), "internal" to rs.getBoolean("internal"),
		) }.list()
		val saved = jdbc.sql("""
			select c.scene_id, s.title, c.cleared_at from ${if (kind == "accounts") "user_cleared" else "visitor_cleared"} c
			left join scene s on s.id = c.scene_id where c.${if (kind == "accounts") "user_id" else "visitor_id"} = :id
			order by c.cleared_at desc, c.scene_id limit 100
		""").param("id", id).query { rs, _ -> mapOf("sceneId" to rs.getString("scene_id"), "title" to rs.getString("title"), "savedAt" to rs.instant("cleared_at")) }.list()
		val rewards = jdbc.sql("select * from reward_grant where owner_id = :id order by granted_at desc, reward_id limit 100")
			.param("id", id).query { rs, _ -> mapOf(
				"id" to rs.getString("reward_id"), "name" to RewardCatalog.find(rs.getString("reward_id"))?.name,
				"reason" to rs.getString("reason"), "source" to rs.getString("source"),
				"sceneId" to rs.getString("scene_id"), "seen" to rs.getBoolean("seen"), "grantedAt" to rs.instant("granted_at"),
			) }.list()
		val days = jdbc.sql("select day::text from activity_day where owner_id = :id order by day desc limit 90")
			.param("id", id).query(String::class.java).list()
		val source = if (kind == "browsers") jdbc.sql("select source, medium, campaign, referrer from visitor_source where visitor_id = :id")
			.param("id", id).query { rs, _ -> mapOf("source" to rs.getString("source"), "medium" to rs.getString("medium"), "campaign" to rs.getString("campaign"), "referrer" to rs.getString("referrer")) }.optional().orElse(null) else null
		return mapOf("user" to user, "events" to events.take(50), "nextCursor" to if (events.size > 50) events[49].id else null,
			"attempts" to attempts, "connections" to connections, "savedScenes" to saved, "rewards" to rewards, "activityDays" to days, "source" to source)
	}

	private fun directorySql(kind: String, includeInternal: Boolean, targeted: Boolean = false): String {
		val filter = if (includeInternal) "true" else MetricsController.EXTERNAL
		val key = if (kind == "accounts") "user_id" else "visitor_id"
		val stats = """
			with stats as (
				select e.$key as id, min(e.created_at) as first_at, max(e.created_at) as last_at, count(*) as events,
					count(distinct e.attempt_id) as attempts,
					count(distinct e.scene_id) filter (where e.type = 'scene_completed') as completed_scenes,
					count(distinct (e.created_at at time zone 'Asia/Seoul')::date) as activity_days,
					count(distinct e.visitor_id) as browsers,
					count(*) filter (where e.auth_state = 'guest') as guest_events,
					count(*) filter (where e.auth_state = 'member') as member_events,
					count(*) filter (where e.auth_state = 'unknown') as unknown_events
				from scene_event e where e.$key is not null and $filter ${if (targeted) "and e.$key = :id" else ""} group by e.$key
			), directory as (
		"""
		return stats + if (kind == "accounts") """
			select u.id, u.name, u.email, u.created_at, st.last_at, coalesce(st.events, 0) as events,
				coalesce(st.attempts, 0) as attempts, coalesce(st.completed_scenes, 0) as completed_scenes,
				coalesce(st.activity_days, 0) as activity_days, coalesce(st.browsers, 0) as browsers,
				exists(select 1 from user_visitor uv join internal_visitor i on i.visitor_id = uv.visitor_id where uv.user_id = u.id) as internal,
				null::text as source, coalesce(st.guest_events, 0) as guest_events, coalesce(st.member_events, 0) as member_events, coalesce(st.unknown_events, 0) as unknown_events
			from app_user u left join stats st on st.id = u.id ${if (targeted) "where u.id = :id" else ""}
			)
		""" else """
			select b.id, null::text as name, null::text as email, coalesce(st.first_at, uv.linked_at) as created_at, st.last_at,
				coalesce(st.events, 0) as events, coalesce(st.attempts, 0) as attempts, coalesce(st.completed_scenes, 0) as completed_scenes,
				coalesce(st.activity_days, 0) as activity_days, coalesce(st.browsers, 0) as browsers,
				exists(select 1 from internal_visitor i where i.visitor_id = b.id) as internal,
				coalesce(vs.source, vs.referrer) as source, coalesce(st.guest_events, 0) as guest_events,
				coalesce(st.member_events, 0) as member_events, coalesce(st.unknown_events, 0) as unknown_events
			from (select id from stats union select visitor_id from user_visitor ${if (targeted) "where visitor_id = :id" else ""}) b
			left join stats st on st.id = b.id left join user_visitor uv on uv.visitor_id = b.id
			left join visitor_source vs on vs.visitor_id = b.id
			)
		"""
	}

	private fun user(rs: ResultSet) = OperatorUser(
		rs.getObject("id", UUID::class.java), rs.getString("name"), rs.getString("email"), rs.instant("created_at"), rs.instant("last_at"),
		rs.getInt("events"), rs.getInt("attempts"), rs.getInt("completed_scenes"), rs.getInt("activity_days"), rs.getInt("browsers"),
		rs.getBoolean("internal"), rs.getString("source"), rs.getInt("guest_events"), rs.getInt("member_events"), rs.getInt("unknown_events"),
	)
	private fun ResultSet.instant(column: String) = getTimestamp(column)?.toInstant()?.toString()
	private fun validateKind(kind: String) { if (kind !in setOf("accounts", "browsers")) badRequest() }
	private fun badRequest(): Nothing = throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid user filter")
}
