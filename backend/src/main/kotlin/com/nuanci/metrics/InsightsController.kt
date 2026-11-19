package com.nuanci.metrics

import com.nuanci.admin.AdminSessions
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.sql.ResultSet
import java.sql.Timestamp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeParseException

data class ReachMetrics(
    val humans: Int,
    val picked: Int,
    val done1Plus: Int,
    val done2Plus: Int,
    val done3Plus: Int,
    val returned2Days: Int,
    val returned3Days: Int,
)

data class InsightsDailyRow(
    val day: String,
    val newHumans: Int,
    val picked: Int,
    val completed: Int,
    val topSource: String?,
    val topSourceCount: Int,
)

data class SceneInsightRow(
    val sortOrder: Int,
    val id: String,
    val title: String,
    val viewers: Int,
    val picked: Int,
    val firstTries: Int,
    val firstWrong: Int,
    val completers: Int,
    val freeLineOpened: Int,
)

data class OutcomeCount(val outcome: String, val count: Int)

data class MissingIntentRow(
    val createdAt: String,
    val sceneId: String,
    val sceneTitle: String?,
    val text: String,
    val outcome: String?,
    val matchedChoiceId: String?,
    val reactionVerdict: String?,
)

data class FreeLineInsights(
    val openedPeople: Int,
    val submittedPeople: Int,
    val outcomes: List<OutcomeCount>,
    val ownPickedPeople: Int,
    val ownCompletedPeople: Int,
    val recentIntents: List<MissingIntentRow>,
)

data class AiCallSummaryRow(
    val feature: String,
    val promptVersion: String,
    val outcome: String,
    val calls: Int,
    val avgLatencyMs: Int,
    val maxLatencyMs: Int,
)

data class PushHourCount(val hour: Int, val count: Int)

data class PushInsights(
    val offerShownPeople: Int,
    val subscribedPeople: Int,
    val activeSubscriptions: Int,
    val activeByHour: List<PushHourCount>,
    val sentSubscriptions: Int,
    val openedPeople: Int,
)

data class ShareInsights(
    val shareCopiedPeople: Int,
    val replyCopiedPeople: Int,
    val shareArrivedNewPeople: Int,
    val replyViewedPeople: Int,
)

data class BotHumanRow(
    val visitorId: String,
    val userAgent: String?,
    val signalCount: Int,
    val lastAt: String,
)

data class ClientBreakdownRow(
    val client: String,
    val visitors: Int,
    val humanSignals: Int,
)

data class RecentVisitorRow(
    val visitorId: String,
    val kind: String,
    val source: String?,
    val firstAt: String,
    val lastAt: String,
    val events: Int,
)

data class HygieneInsights(
    val botHumanCount: Int,
    val botHumans: List<BotHumanRow>,
    val clients: List<ClientBreakdownRow>,
    val recentVisitors: List<RecentVisitorRow>,
)

data class InsightsResponse(
    val since: String,
    val pivot: String?,
    val reach: ReachMetrics,
    val beforeReach: ReachMetrics?,
    val afterReach: ReachMetrics?,
    val daily: List<InsightsDailyRow>,
    val scenes: List<SceneInsightRow>,
    val freeLine: FreeLineInsights,
    val aiCalls: List<AiCallSummaryRow>,
    val push: PushInsights,
    val share: ShareInsights,
    val hygiene: HygieneInsights,
)

// 어드민 "핵심 질문" 화면에 필요한 외부 사람 도달·장면별 난이도·신규 기능·데이터 위생 지표를 집계한다
@RestController
@RequestMapping("/api/admin/insights")
class InsightsController(
    private val jdbc: JdbcClient,
    private val sessions: AdminSessions,
) {
    @GetMapping
    fun insights(
        @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?,
        @RequestParam(required = false) since: String?,
        @RequestParam(required = false) pivot: String?,
    ): InsightsResponse {
        sessions.require(auth)
        val sinceDate = parseDate(since, DEFAULT_SINCE, "since")
        val pivotDate = if (pivot.isNullOrBlank()) null else parseDate(pivot, DEFAULT_SINCE, "pivot")
        val sinceInstant = sinceDate.atStartOfDay(SEOUL).toInstant()
        val pivotInstant = pivotDate?.atStartOfDay(SEOUL)?.toInstant()
        val sinceTs = Timestamp.from(sinceInstant)

        val reach = queryReach(sinceInstant, null)
        val beforeReach = pivotInstant?.let { queryReach(sinceInstant, it) }
        val afterReach = pivotInstant?.let { queryReach(it, null) }

        return InsightsResponse(
            since = sinceDate.toString(),
            pivot = pivotDate?.toString(),
            reach = reach,
            beforeReach = beforeReach,
            afterReach = afterReach,
            daily = queryDaily(),
            scenes = queryScenes(sinceTs),
            freeLine = queryFreeLine(sinceTs),
            aiCalls = queryAiCalls(),
            push = queryPush(sinceTs),
            share = queryShare(sinceTs),
            hygiene = queryHygiene(sinceTs),
        )
    }

    // 지정 기간 안에서 활동한 외부 사람의 첫 답·완료 깊이·다일 재방문을 집계한다
    private fun queryReach(from: Instant, until: Instant?): ReachMetrics {
        val untilClause = if (until != null) "and e.created_at < :until" else ""
        val stmt = jdbc.sql(
            """
            with per as (
                select e.visitor_id,
                       bool_or(e.type = 'choice_selected') as picked,
                       count(distinct e.scene_id) filter (where e.type = 'scene_completed') as done_scenes,
                       count(distinct (e.created_at at time zone 'Asia/Seoul')::date) as active_days
                from scene_event e
                where e.created_at >= :from
                  $untilClause
                  and $EXTERNAL_HUMAN
                group by e.visitor_id
            )
            select count(*) as humans,
                   count(*) filter (where picked) as picked,
                   count(*) filter (where done_scenes >= 1) as done_1plus,
                   count(*) filter (where done_scenes >= 2) as done_2plus,
                   count(*) filter (where done_scenes >= 3) as done_3plus,
                   count(*) filter (where active_days >= 2) as returned_2days,
                   count(*) filter (where active_days >= 3) as returned_3days
            from per
            """,
        ).param("from", Timestamp.from(from))
        if (until != null) stmt.param("until", Timestamp.from(until))
        return stmt.query { rs, _ ->
            ReachMetrics(
                humans = rs.getInt("humans"),
                picked = rs.getInt("picked"),
                done1Plus = rs.getInt("done_1plus"),
                done2Plus = rs.getInt("done_2plus"),
                done3Plus = rs.getInt("done_3plus"),
                returned2Days = rs.getInt("returned_2days"),
                returned3Days = rs.getInt("returned_3days"),
            )
        }.single()
    }

    // 최근 14일(Asia/Seoul) 일별 새 외부 사람·첫 답·완료·상위 유입 source를 집계한다
    private fun queryDaily(): List<InsightsDailyRow> {
        val today = LocalDate.now(SEOUL)
        val startDay = today.minusDays(13)
        val startInstant = startDay.atStartOfDay(SEOUL).toInstant()
        return jdbc.sql(
            """
            with days as (
                select generate_series(cast(:startDay as date), cast(:endDay as date), interval '1 day')::date as day
            ),
            first_seen as (
                select e.visitor_id,
                       (min(e.created_at) at time zone 'Asia/Seoul')::date as first_day
                from scene_event e
                where $EXTERNAL_HUMAN
                group by e.visitor_id
            ),
            new_daily as (
                select first_day as day, count(*) as new_humans
                from first_seen
                where first_day >= cast(:startDay as date)
                group by first_day
            ),
            activity as (
                select (e.created_at at time zone 'Asia/Seoul')::date as day,
                       count(distinct e.visitor_id) filter (where e.type = 'choice_selected') as picked,
                       count(distinct e.visitor_id) filter (where e.type = 'scene_completed') as completed
                from scene_event e
                where e.created_at >= :startInstant
                  and $EXTERNAL_HUMAN
                group by 1
            ),
            source_counts as (
                select f.first_day as day,
                       coalesce(nullif(vs.source, ''), nullif(vs.referrer, '')) as src,
                       count(*) as cnt
                from first_seen f
                join visitor_source vs on vs.visitor_id = f.visitor_id
                where f.first_day >= cast(:startDay as date)
                  and coalesce(nullif(vs.source, ''), nullif(vs.referrer, '')) is not null
                group by 1, 2
            ),
            top_source as (
                select distinct on (day) day, src, cnt
                from source_counts
                order by day, cnt desc, src
            )
            select d.day::text as day,
                   coalesce(n.new_humans, 0) as new_humans,
                   coalesce(a.picked, 0) as picked,
                   coalesce(a.completed, 0) as completed,
                   t.src as top_source,
                   coalesce(t.cnt, 0) as top_source_count
            from days d
            left join new_daily n on n.day = d.day
            left join activity a on a.day = d.day
            left join top_source t on t.day = d.day
            order by d.day desc
            """,
        )
            .param("startDay", startDay)
            .param("endDay", today)
            .param("startInstant", Timestamp.from(startInstant))
            .query { rs, _ ->
                InsightsDailyRow(
                    day = rs.getString("day"),
                    newHumans = rs.getInt("new_humans"),
                    picked = rs.getInt("picked"),
                    completed = rs.getInt("completed"),
                    topSource = rs.getString("top_source"),
                    topSourceCount = rs.getInt("top_source_count"),
                )
            }
            .list()
    }

    // 공개 장면 순서대로 외부 사람 열람·선택·1단계 첫 답 오답률·완료·내 말로 해 보기 열람을 집계한다
    private fun queryScenes(since: Timestamp): List<SceneInsightRow> = jdbc.sql(
        """
        with stats as (
            select e.scene_id,
                   count(distinct e.visitor_id) filter (where e.type = 'scene_viewed') as viewers,
                   count(distinct e.visitor_id) filter (where e.type = 'choice_selected') as picked,
                   count(distinct e.visitor_id) filter (where e.type = 'scene_completed') as completers,
                   count(distinct e.visitor_id) filter (where e.type = 'free_line_opened') as free_line_opened
            from scene_event e
            where e.scene_id is not null
              and e.created_at >= :since
              and $EXTERNAL_HUMAN
            group by e.scene_id
        ),
        first_pick as (
            select distinct on (e.scene_id, e.visitor_id)
                   e.scene_id, e.visitor_id, e.scene_version, e.choice_id
            from scene_event e
            where e.type = 'choice_selected'
              and e.step = 'base'
              and e.scene_id is not null
              and e.created_at >= :since
              and $EXTERNAL_HUMAN
            order by e.scene_id, e.visitor_id, e.created_at, e.id
        ),
        acc as (
            select fp.scene_id,
                   count(*) filter (where choice.verdict is not null) as first_tries,
                   count(*) filter (where choice.verdict is not null and choice.verdict <> 'good') as first_wrong
            from first_pick fp
            left join scene_version v on v.scene_id = fp.scene_id and v.version = fp.scene_version
            left join lateral (
                select elem->>'verdict' as verdict
                from json_array_elements(v.content->'base'->'choices') elem
                where elem->>'id' = fp.choice_id
                limit 1
            ) choice on true
            group by fp.scene_id
        )
        select s.sort_order,
               s.id,
               s.title,
               coalesce(st.viewers, 0) as viewers,
               coalesce(st.picked, 0) as picked,
               coalesce(a.first_tries, 0) as first_tries,
               coalesce(a.first_wrong, 0) as first_wrong,
               coalesce(st.completers, 0) as completers,
               coalesce(st.free_line_opened, 0) as free_line_opened
        from scene s
        left join stats st on st.scene_id = s.id
        left join acc a on a.scene_id = s.id
        where s.status = 'published'
        order by s.sort_order, s.id
        """,
    )
        .param("since", since)
        .query { rs, _ ->
            SceneInsightRow(
                sortOrder = rs.getInt("sort_order"),
                id = rs.getString("id"),
                title = rs.getString("title"),
                viewers = rs.getInt("viewers"),
                picked = rs.getInt("picked"),
                firstTries = rs.getInt("first_tries"),
                firstWrong = rs.getInt("first_wrong"),
                completers = rs.getInt("completers"),
                freeLineOpened = rs.getInt("free_line_opened"),
            )
        }
        .list()

    // 내 말로 해 보기 퍼널과 outcome별 건수, 최근 외부 사람 원문 30건을 조회한다
    private fun queryFreeLine(since: Timestamp): FreeLineInsights {
        val openedPeople = jdbc.sql(
            """
            select count(distinct e.visitor_id)
            from scene_event e
            where e.type = 'free_line_opened'
              and e.created_at >= :since
              and $EXTERNAL_HUMAN
            """,
        ).param("since", since).query(Int::class.java).single()

        val submittedPeople = jdbc.sql(
            """
            select count(distinct e.visitor_id)
            from missing_intent e
            where e.created_at >= :since
              and $EXTERNAL_HUMAN
            """,
        ).param("since", since).query(Int::class.java).single()

        val outcomes = jdbc.sql(
            """
            select coalesce(e.outcome, '(없음)') as outcome, count(*) as cnt
            from missing_intent e
            where e.created_at >= :since
              and $EXTERNAL_HUMAN
            group by 1
            order by cnt desc, outcome
            """,
        ).param("since", since).query { rs, _ ->
            OutcomeCount(rs.getString("outcome"), rs.getInt("cnt"))
        }.list()

        val ownPickedPeople = jdbc.sql(
            """
            select count(distinct e.visitor_id)
            from scene_event e
            where e.type = 'choice_selected'
              and e.choice_id like 'own-%'
              and e.created_at >= :since
              and $EXTERNAL_HUMAN
            """,
        ).param("since", since).query(Int::class.java).single()

        val ownCompletedPeople = jdbc.sql(
            """
            select count(distinct e.visitor_id)
            from scene_event e
            where e.type = 'choice_selected'
              and e.choice_id like 'own-%'
              and e.created_at >= :since
              and $EXTERNAL_HUMAN
              and exists (
                  select 1 from scene_event done
                  where done.visitor_id = e.visitor_id
                    and done.scene_id = e.scene_id
                    and done.type = 'scene_completed'
                    and done.created_at >= e.created_at
              )
            """,
        ).param("since", since).query(Int::class.java).single()

        val recentIntents = jdbc.sql(
            """
            select e.created_at,
                   e.scene_id,
                   s.title as scene_title,
                   e.text,
                   e.outcome,
                   e.matched_choice_id,
                   e.reaction_verdict
            from missing_intent e
            left join scene s on s.id = e.scene_id
            where e.created_at >= :since
              and $EXTERNAL_HUMAN
            order by e.created_at desc, e.id desc
            limit 30
            """,
        ).param("since", since).query { rs, _ ->
            MissingIntentRow(
                createdAt = rs.instant("created_at")!!,
                sceneId = rs.getString("scene_id"),
                sceneTitle = rs.getString("scene_title"),
                text = rs.getString("text"),
                outcome = rs.getString("outcome"),
                matchedChoiceId = rs.getString("matched_choice_id"),
                reactionVerdict = rs.getString("reaction_verdict"),
            )
        }.list()

        return FreeLineInsights(
            openedPeople = openedPeople,
            submittedPeople = submittedPeople,
            outcomes = outcomes,
            ownPickedPeople = ownPickedPeople,
            ownCompletedPeople = ownCompletedPeople,
            recentIntents = recentIntents,
        )
    }

    // 최근 7일 AI 호출을 feature·prompt_version·outcome별로 묶어 지연시간과 함께 집계한다
    private fun queryAiCalls(): List<AiCallSummaryRow> = jdbc.sql(
        """
        select feature,
               prompt_version,
               outcome,
               count(*) as calls,
               round(avg(latency_ms))::int as avg_latency_ms,
               max(latency_ms) as max_latency_ms
        from ai_call
        where created_at >= now() - interval '7 days'
        group by feature, prompt_version, outcome
        order by feature, prompt_version, calls desc
        """,
    ).query { rs, _ ->
        AiCallSummaryRow(
            feature = rs.getString("feature"),
            promptVersion = rs.getString("prompt_version"),
            outcome = rs.getString("outcome"),
            calls = rs.getInt("calls"),
            avgLatencyMs = rs.getInt("avg_latency_ms"),
            maxLatencyMs = rs.getInt("max_latency_ms"),
        )
    }.list()

    // 웹 푸시 제안·구독·시간대별 활성 구독·발송·열람 현황을 집계한다
    private fun queryPush(since: Timestamp): PushInsights {
        val events = jdbc.sql(
            """
            select count(distinct e.visitor_id) filter (where e.type = 'push_offer_shown') as shown,
                   count(distinct e.visitor_id) filter (where e.type = 'push_subscribed') as subscribed,
                   count(distinct e.visitor_id) filter (where e.type = 'push_opened') as opened
            from scene_event e
            where e.type in ('push_offer_shown', 'push_subscribed', 'push_opened')
              and e.created_at >= :since
              and $EXTERNAL_HUMAN
            """,
        ).param("since", since).query { rs, _ ->
            Triple(rs.getInt("shown"), rs.getInt("subscribed"), rs.getInt("opened"))
        }.single()

        val activeByHour = jdbc.sql(
            """
            select e.hour, count(*) as cnt
            from push_subscription e
            where e.active
              and ${MetricsController.EXTERNAL}
            group by e.hour
            order by e.hour
            """,
        ).query { rs, _ ->
            PushHourCount(rs.getInt("hour"), rs.getInt("cnt"))
        }.list()

        val sentSubscriptions = jdbc.sql(
            """
            select count(*)
            from push_subscription e
            where e.last_sent_at is not null
              and ${MetricsController.EXTERNAL}
            """,
        ).query(Int::class.java).single()

        return PushInsights(
            offerShownPeople = events.first,
            subscribedPeople = events.second,
            activeSubscriptions = activeByHour.sumOf { it.count },
            activeByHour = activeByHour,
            sentSubscriptions = sentSubscriptions,
            openedPeople = events.third,
        )
    }

    // 공유·답장 링크 복사와 자가 클릭을 제외한 순수 공유 유입·답장 열람을 집계한다
    private fun queryShare(since: Timestamp): ShareInsights {
        val direct = jdbc.sql(
            """
            select count(distinct e.visitor_id) filter (where e.type = 'share_link_copied') as share_copied,
                   count(distinct e.visitor_id) filter (where e.type = 'reply_link_copied') as reply_copied,
                   count(distinct e.visitor_id) filter (where e.type = 'reply_viewed') as reply_viewed
            from scene_event e
            where e.type in ('share_link_copied', 'reply_link_copied', 'reply_viewed')
              and e.created_at >= :since
              and $EXTERNAL_HUMAN
            """,
        ).param("since", since).query { rs, _ ->
            Triple(rs.getInt("share_copied"), rs.getInt("reply_copied"), rs.getInt("reply_viewed"))
        }.single()

        val shareArrivedNew = jdbc.sql(
            """
            with per as (
                select e.visitor_id,
                       min(e.created_at) filter (where e.entry = 'share') as first_share_at,
                       min(e.created_at) filter (where e.type in ('share_link_copied', 'reply_link_copied')) as first_copy_at
                from scene_event e
                where $EXTERNAL_HUMAN
                group by e.visitor_id
            )
            select count(*)
            from per
            where first_share_at >= :since
              and (first_copy_at is null or first_copy_at > first_share_at)
            """,
        ).param("since", since).query(Int::class.java).single()

        return ShareInsights(
            shareCopiedPeople = direct.first,
            replyCopiedPeople = direct.second,
            shareArrivedNewPeople = shareArrivedNew,
            replyViewedPeople = direct.third,
        )
    }

    // 봇 오분류 의심 방문자, client 분류별 사람 신호 현황, 최근 24시간 방문자 목록을 조회한다
    private fun queryHygiene(since: Timestamp): HygieneInsights {
        val botHumanRows = jdbc.sql(
            """
            select e.visitor_id,
                   vc.user_agent,
                   count(*) filter (where e.type in (${MetricsController.HUMAN_SIGNALS})) as signal_count,
                   max(e.created_at) as last_at,
                   count(*) over() as total_count
            from scene_event e
            join visitor_client vc on vc.visitor_id = e.visitor_id and vc.client = 'bot'
            where e.created_at >= :since
              and not exists (select 1 from internal_visitor i where i.visitor_id = e.visitor_id)
            group by e.visitor_id, vc.user_agent
            having count(*) filter (where e.type in (${MetricsController.HUMAN_SIGNALS})) > 0
            order by last_at desc
            limit 50
            """,
        ).param("since", since).query { rs, _ ->
            rs.getInt("total_count") to BotHumanRow(
                visitorId = rs.getString("visitor_id"),
                userAgent = rs.getString("user_agent"),
                signalCount = rs.getInt("signal_count"),
                lastAt = rs.instant("last_at")!!,
            )
        }.list()

        val clients = jdbc.sql(
            """
            with v as (
                select e.visitor_id,
                       bool_or(e.type in (${MetricsController.HUMAN_SIGNALS})) as has_signal
                from scene_event e
                where e.created_at >= :since
                  and not exists (select 1 from internal_visitor i where i.visitor_id = e.visitor_id)
                group by e.visitor_id
            )
            select coalesce(vc.client, '(없음)') as client,
                   count(*) as visitors,
                   count(*) filter (where v.has_signal) as human_signals
            from v
            left join visitor_client vc on vc.visitor_id = v.visitor_id
            group by 1
            order by visitors desc, client
            """,
        ).param("since", since).query { rs, _ ->
            ClientBreakdownRow(
                client = rs.getString("client"),
                visitors = rs.getInt("visitors"),
                humanSignals = rs.getInt("human_signals"),
            )
        }.list()

        val recentVisitors = jdbc.sql(
            """
            with recent as (
                select e.visitor_id,
                       min(e.created_at) as first_at,
                       max(e.created_at) as last_at,
                       count(*) as events
                from scene_event e
                where e.created_at >= now() - interval '24 hours'
                group by e.visitor_id
            )
            select r.visitor_id,
                   case
                       when exists (select 1 from internal_visitor i where i.visitor_id = r.visitor_id) then 'internal'
                       when vc.client = 'bot' then 'bot'
                       else 'external'
                   end as kind,
                   coalesce(nullif(vs.source, ''), nullif(vs.referrer, '')) as source,
                   r.first_at,
                   r.last_at,
                   r.events
            from recent r
            left join visitor_client vc on vc.visitor_id = r.visitor_id
            left join visitor_source vs on vs.visitor_id = r.visitor_id
            order by r.last_at desc
            limit 50
            """,
        ).query { rs, _ ->
            RecentVisitorRow(
                visitorId = rs.getString("visitor_id"),
                kind = rs.getString("kind"),
                source = rs.getString("source"),
                firstAt = rs.instant("first_at")!!,
                lastAt = rs.instant("last_at")!!,
                events = rs.getInt("events"),
            )
        }.list()

        return HygieneInsights(
            botHumanCount = botHumanRows.firstOrNull()?.first ?: 0,
            botHumans = botHumanRows.map { it.second },
            clients = clients,
            recentVisitors = recentVisitors,
        )
    }

    private fun parseDate(raw: String?, fallback: LocalDate, name: String): LocalDate {
        if (raw.isNullOrBlank()) return fallback
        return try {
            LocalDate.parse(raw)
        } catch (_: DateTimeParseException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid $name")
        }
    }

    private fun ResultSet.instant(column: String) = getTimestamp(column)?.toInstant()?.toString()

    companion object {
        private val SEOUL = ZoneId.of("Asia/Seoul")
        private val DEFAULT_SINCE = LocalDate.of(2026, 10, 23)
        private const val EXTERNAL_HUMAN = "${MetricsController.EXTERNAL} and ${MetricsController.HUMAN_ONLY}"
    }
}
