import Link from "next/link";
import { InsightsSceneTable, type SceneInsightRow } from "./insights-scene-table";
import { AdminEmpty, AdminPanel, AdminStat, adminTime, number, percent } from "./ui";

export type ReachMetrics = {
    humans: number;
    picked: number;
    done1Plus: number;
    done2Plus: number;
    done3Plus: number;
    returned2Days: number;
    returned3Days: number;
};

export type InsightsDailyRow = {
    day: string;
    newHumans: number;
    picked: number;
    completed: number;
    topSource: string | null;
    topSourceCount: number;
};

export type OutcomeCount = {
    outcome: string;
    count: number;
};

export type MissingIntentRow = {
    createdAt: string;
    sceneId: string;
    sceneTitle: string | null;
    text: string;
    outcome: string | null;
    matchedChoiceId: string | null;
    reactionVerdict: string | null;
};

export type FreeLineInsights = {
    openedPeople: number;
    submittedPeople: number;
    outcomes: OutcomeCount[];
    ownPickedPeople: number;
    ownCompletedPeople: number;
    recentIntents: MissingIntentRow[];
};

export type AiCallSummaryRow = {
    feature: string;
    promptVersion: string;
    outcome: string;
    calls: number;
    avgLatencyMs: number;
    maxLatencyMs: number;
};

export type PushHourCount = {
    hour: number;
    count: number;
};

export type PushInsights = {
    offerShownPeople: number;
    subscribedPeople: number;
    activeSubscriptions: number;
    activeByHour: PushHourCount[];
    sentSubscriptions: number;
    openedPeople: number;
};

export type ShareInsights = {
    shareCopiedPeople: number;
    replyCopiedPeople: number;
    shareArrivedNewPeople: number;
    replyViewedPeople: number;
};

export type BotHumanRow = {
    visitorId: string;
    userAgent: string | null;
    signalCount: number;
    lastAt: string;
};

export type ClientBreakdownRow = {
    client: string;
    visitors: number;
    humanSignals: number;
};

export type RecentVisitorRow = {
    visitorId: string;
    kind: "external" | "internal" | "bot" | string;
    source: string | null;
    firstAt: string;
    lastAt: string;
    events: number;
};

export type HygieneInsights = {
    botHumanCount: number;
    botHumans: BotHumanRow[];
    clients: ClientBreakdownRow[];
    recentVisitors: RecentVisitorRow[];
};

export type InsightsResponse = {
    since: string;
    pivot: string | null;
    reach: ReachMetrics;
    beforeReach: ReachMetrics | null;
    afterReach: ReachMetrics | null;
    daily: InsightsDailyRow[];
    scenes: SceneInsightRow[];
    freeLine: FreeLineInsights;
    aiCalls: AiCallSummaryRow[];
    push: PushInsights;
    share: ShareInsights;
    hygiene: HygieneInsights;
};

const KNOWN_OUTCOMES = [
    "matched",
    "reacted",
    "off_topic",
    "too_far",
    "unmatched",
    "unavailable",
] as const;

const REACH_ROWS: Array<{ key: keyof ReachMetrics; label: string }> = [
    { key: "humans", label: "외부 사람 수" },
    { key: "picked", label: "첫 답 고른 사람" },
    { key: "done1Plus", label: "장면 1개 이상 완료" },
    { key: "done2Plus", label: "서로 다른 장면 2개+ 완료" },
    { key: "done3Plus", label: "서로 다른 장면 3개+ 완료" },
    { key: "returned2Days", label: "다른 날 다시 온 사람 (2일+)" },
    { key: "returned3Days", label: "다른 날 다시 온 사람 (3일+)" },
];

function ratioPeople(part: number, whole: number) {
    const base = `${number(part)}명 / ${number(whole)}명`;
    if (whole < 10) return base;
    return `${base} (${percent(part, whole)}%)`;
}

function verdictLabel(verdict: string | null) {
    if (verdict === "good") return "O (good)";
    if (verdict === "meh") return "△ (meh)";
    if (verdict === "bad") return "X (bad)";
    return verdict;
}

function visitorKindBadge(kind: string) {
    if (kind === "internal") return { label: "내부", className: "adm-badge adm-badge-neutral" };
    if (kind === "bot") return { label: "봇", className: "adm-badge adm-badge-warning" };
    return { label: "외부", className: "adm-badge adm-badge-informative" };
}

// 1. 외부 사람 도달·완료 깊이·재방문과 최근 14일 일별 추이 섹션
export function ReachSection({ data }: { data: InsightsResponse }) {
    const hasPivot = Boolean(data.pivot && data.beforeReach && data.afterReach);
    return (
        <div className="adm-section-space">
            {!hasPivot && (
                <div className="adm-stats adm-stats-four">
                    <AdminStat
                        label="외부 사람 수"
                        tone="informative"
                        value={`${number(data.reach.humans)}명`}
                        note={`${data.since} ~ 지금`}
                    />
                    <AdminStat
                        label="첫 답 고른 사람"
                        value={`${number(data.reach.picked)}명`}
                        note={ratioPeople(data.reach.picked, data.reach.humans)}
                    />
                    <AdminStat
                        label="장면 1개 이상 완료"
                        tone="positive"
                        value={`${number(data.reach.done1Plus)}명`}
                        note={ratioPeople(data.reach.done1Plus, data.reach.humans)}
                    />
                    <AdminStat
                        label="다른 날 다시 온 사람 (2일+)"
                        value={`${number(data.reach.returned2Days)}명`}
                        note={ratioPeople(data.reach.returned2Days, data.reach.humans)}
                    />
                </div>
            )}

            <div className="adm-grid adm-grid-2">
                <AdminPanel
                    title="1. 진짜 사람은 어디까지 가고, 다시 오나"
                    description={
                        hasPivot
                            ? `기준일 ${data.pivot} 전/후 비교 · 외부 사람 대비 비율(분모 10 미만은 % 생략)`
                            : `${data.since} 이후 외부 사람 기준 · 분모 10 미만은 % 생략`
                    }
                >
                    <div className="adm-table-scroll">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>단계</th>
                                    {hasPivot ? (
                                        <>
                                            <th className="adm-numeric">
                                                전 ({data.since} ~ {data.pivot})
                                            </th>
                                            <th className="adm-numeric">
                                                후 ({data.pivot} ~ 지금)
                                            </th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="adm-numeric">사람 수</th>
                                            <th className="adm-numeric">외부 사람 대비</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {REACH_ROWS.map((row) => (
                                    <tr key={row.key}>
                                        <td>{row.label}</td>
                                        {hasPivot && data.beforeReach && data.afterReach ? (
                                            <>
                                                <td className="adm-numeric">
                                                    {row.key === "humans"
                                                        ? `${number(data.beforeReach.humans)}명`
                                                        : ratioPeople(data.beforeReach[row.key], data.beforeReach.humans)}
                                                </td>
                                                <td className="adm-numeric">
                                                    {row.key === "humans"
                                                        ? `${number(data.afterReach.humans)}명`
                                                        : ratioPeople(data.afterReach[row.key], data.afterReach.humans)}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="adm-numeric">{number(data.reach[row.key])}명</td>
                                                <td className="adm-numeric">
                                                    {row.key === "humans"
                                                        ? "-"
                                                        : ratioPeople(data.reach[row.key], data.reach.humans)}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </AdminPanel>

                <AdminPanel
                    title="일별 추이 (최근 14일)"
                    description="Asia/Seoul 기준 · 새 외부 사람과 그날 유입 상위 source 1개"
                >
                    <div className="adm-table-scroll">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>날짜</th>
                                    <th className="adm-numeric">새 외부 사람</th>
                                    <th className="adm-numeric">첫 답</th>
                                    <th className="adm-numeric">완료한 사람</th>
                                    <th>상위 source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.daily.map((row) => (
                                    <tr key={row.day}>
                                        <td>{row.day}</td>
                                        <td className={`adm-numeric${row.newHumans === 0 ? " adm-value-zero" : ""}`}>
                                            {number(row.newHumans)}명
                                        </td>
                                        <td className={`adm-numeric${row.picked === 0 ? " adm-value-zero" : ""}`}>
                                            {number(row.picked)}명
                                        </td>
                                        <td className={`adm-numeric${row.completed === 0 ? " adm-value-zero" : ""}`}>
                                            {number(row.completed)}명
                                        </td>
                                        <td>
                                            {row.topSource
                                                ? `${row.topSource} (${number(row.topSourceCount)}명)`
                                                : <span className="adm-value-zero">-</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </AdminPanel>
            </div>
        </div>
    );
}

// 2. 공개 장면 순서별 도달·오답률·완료율 표 섹션
export function ScenesSection({ scenes, since }: { scenes: SceneInsightRow[]; since: string }) {
    return (
        <div className="adm-section-space">
            <AdminPanel
                title="2. 장면별"
                description={`${since} 이후 외부 사람 기준 · 공개 장면 순서(sort_order) · 오답률 35~65% 밖 경고(5명 미만 -) · 행을 누르면 이용 지표 장면 상세로 이동`}
            >
                <InsightsSceneTable rows={scenes} />
            </AdminPanel>
        </div>
    );
}

// 3. 내 말로 해 보기·AI 호출·웹 푸시·공유·답장 섹션
export function NewFeaturesSection({ data }: { data: InsightsResponse }) {
    const { freeLine, aiCalls, push, share } = data;
    const outcomeMap = new Map(freeLine.outcomes.map((item) => [item.outcome, item.count]));
    const extraOutcomes = freeLine.outcomes.filter(
        (item) => !(KNOWN_OUTCOMES as readonly string[]).includes(item.outcome),
    );

    return (
        <div className="adm-section-space">
            <AdminPanel
                title="3. 새 장치가 쓰이나 — 내 말로 해 보기"
                description={`${data.since} 이후 외부 사람 기준 · 칸 열기 → 제출 → outcome → own- 선택 → 그 장면 완료`}
            >
                <div className="adm-panel-body">
                    <div className="adm-stats adm-stats-four">
                        <AdminStat
                            label="내 말로 열기"
                            tone="informative"
                            value={`${number(freeLine.openedPeople)}명`}
                            note="free_line_opened"
                        />
                        <AdminStat
                            label="직접 써서 제출"
                            value={`${number(freeLine.submittedPeople)}명`}
                            note={ratioPeople(freeLine.submittedPeople, freeLine.openedPeople)}
                        />
                        <AdminStat
                            label="own- 보기 선택"
                            value={`${number(freeLine.ownPickedPeople)}명`}
                            note={ratioPeople(freeLine.ownPickedPeople, freeLine.submittedPeople)}
                        />
                        <AdminStat
                            label="그 장면 완료"
                            tone="positive"
                            value={`${number(freeLine.ownCompletedPeople)}명`}
                            note={ratioPeople(freeLine.ownCompletedPeople, freeLine.ownPickedPeople)}
                        />
                    </div>
                    <p className="adm-muted" style={{ marginBottom: 8 }}>
                        missing_intent outcome별 건수
                    </p>
                    <div className="adm-mix-tags">
                        {KNOWN_OUTCOMES.map((key) => (
                            <span key={key}>
                                {key}
                                <strong>{number(outcomeMap.get(key) ?? 0)}건</strong>
                            </span>
                        ))}
                        {extraOutcomes.map((item) => (
                            <span key={item.outcome}>
                                {item.outcome}
                                <strong>{number(item.count)}건</strong>
                            </span>
                        ))}
                    </div>
                </div>
                {freeLine.recentIntents.length === 0 ? (
                    <AdminEmpty>기간 내 외부 사람이 남긴 missing_intent 원문이 없습니다.</AdminEmpty>
                ) : (
                    <div className="adm-table-scroll">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>시각</th>
                                    <th>장면</th>
                                    <th>쓴 말</th>
                                    <th>outcome</th>
                                    <th>붙은 보기 / 판정</th>
                                </tr>
                            </thead>
                            <tbody>
                                {freeLine.recentIntents.map((row, index) => (
                                    <tr key={`${row.createdAt}-${row.sceneId}-${index}`}>
                                        <td style={{ whiteSpace: "nowrap" }}>{adminTime(row.createdAt)}</td>
                                        <td>
                                            {row.sceneTitle ?? row.sceneId}
                                            <span className="adm-secondary">
                                                <code>{row.sceneId}</code>
                                            </span>
                                        </td>
                                        <td>{row.text}</td>
                                        <td>
                                            {row.outcome ? (
                                                <span className="adm-badge adm-badge-neutral">{row.outcome}</span>
                                            ) : (
                                                <span className="adm-value-zero">-</span>
                                            )}
                                        </td>
                                        <td>
                                            {row.matchedChoiceId || row.reactionVerdict ? (
                                                <>
                                                    {row.matchedChoiceId && <code>{row.matchedChoiceId}</code>}
                                                    {row.matchedChoiceId && row.reactionVerdict && " · "}
                                                    {row.reactionVerdict && verdictLabel(row.reactionVerdict)}
                                                </>
                                            ) : (
                                                <span className="adm-value-zero">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminPanel>

            <div className="adm-grid adm-grid-2 adm-section-space">
                <AdminPanel
                    title="AI 호출 (최근 7일)"
                    description="feature · prompt_version · outcome별 건수와 지연시간(ms)"
                >
                    {aiCalls.length === 0 ? (
                        <AdminEmpty>최근 7일 AI 호출 기록이 없습니다.</AdminEmpty>
                    ) : (
                        <div className="adm-table-scroll">
                            <table className="adm-table">
                                <thead>
                                    <tr>
                                        <th>feature</th>
                                        <th>prompt_version</th>
                                        <th>outcome</th>
                                        <th className="adm-numeric">건수</th>
                                        <th className="adm-numeric">평균 ms</th>
                                        <th className="adm-numeric">최대 ms</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {aiCalls.map((row) => (
                                        <tr key={`${row.feature}:${row.promptVersion}:${row.outcome}`}>
                                            <td><code>{row.feature}</code></td>
                                            <td><code>{row.promptVersion}</code></td>
                                            <td>
                                                <span
                                                    className={`adm-badge ${
                                                        row.outcome === "ok"
                                                            ? "adm-badge-success"
                                                            : "adm-badge-warning"
                                                    }`}
                                                >
                                                    {row.outcome}
                                                </span>
                                            </td>
                                            <td className="adm-numeric">{number(row.calls)}건</td>
                                            <td className="adm-numeric">{number(row.avgLatencyMs)}</td>
                                            <td className="adm-numeric">{number(row.maxLatencyMs)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </AdminPanel>

                <AdminPanel
                    title="공유 · 답장"
                    description={`${data.since} 이후 외부 사람 기준 · 공유 유입은 복사한 본인 제외`}
                >
                    <div className="adm-panel-body">
                        <div className="adm-stats adm-stats-four" style={{ marginBottom: 0 }}>
                            <AdminStat
                                label="공유 링크 복사"
                                value={`${number(share.shareCopiedPeople)}명`}
                                note="share_link_copied"
                            />
                            <AdminStat
                                label="공유 유입 새 사람"
                                tone="informative"
                                value={`${number(share.shareArrivedNewPeople)}명`}
                                note="entry=share · 본인 제외"
                            />
                            <AdminStat
                                label="답장 링크 복사"
                                value={`${number(share.replyCopiedPeople)}명`}
                                note="reply_link_copied"
                            />
                            <AdminStat
                                label="답장 열람"
                                tone="positive"
                                value={`${number(share.replyViewedPeople)}명`}
                                note="reply_viewed"
                            />
                        </div>
                    </div>
                </AdminPanel>
            </div>

            <div className="adm-section-space">
                <AdminPanel
                    title="웹 푸시"
                    description={`${data.since} 이후 외부 사람 퍼널 + 현재 활성·발송 구독 현황`}
                >
                    <div className="adm-panel-body">
                        <div className="adm-stats">
                            <AdminStat
                                label="제안 노출"
                                value={`${number(push.offerShownPeople)}명`}
                                note="push_offer_shown"
                            />
                            <AdminStat
                                label="구독 완료"
                                tone="informative"
                                value={`${number(push.subscribedPeople)}명`}
                                note={ratioPeople(push.subscribedPeople, push.offerShownPeople)}
                            />
                            <AdminStat
                                label="활성 구독"
                                value={`${number(push.activeSubscriptions)}건`}
                                note="active=true"
                            />
                            <AdminStat
                                label="발송 구독"
                                value={`${number(push.sentSubscriptions)}건`}
                                note="last_sent_at 있음"
                            />
                            <AdminStat
                                label="알림 열람"
                                tone="positive"
                                value={`${number(push.openedPeople)}명`}
                                note="push_opened"
                            />
                        </div>
                        <p className="adm-muted" style={{ marginBottom: 8 }}>
                            시간대별 활성 구독 수 (Asia/Seoul)
                        </p>
                        {push.activeByHour.length === 0 ? (
                            <p className="adm-muted">활성 구독이 없습니다.</p>
                        ) : (
                            <div className="adm-mix-tags">
                                {push.activeByHour.map((row) => (
                                    <span key={row.hour}>
                                        {String(row.hour).padStart(2, "0")}:00
                                        <strong>{number(row.count)}건</strong>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </AdminPanel>
            </div>
        </div>
    );
}

// 4. 봇 오분류 의심, client 분류별 현황, 최근 24시간 방문자 섹션
export function HygieneSection({ hygiene, since }: { hygiene: HygieneInsights; since: string }) {
    return (
        <div className="adm-section-space">
            <AdminPanel
                title="4. 데이터 위생"
                description={`${since} 이후 내부 방문 제외 기준 · 봇으로 분류됐는데 사람 신호를 남긴 방문자 점검`}
                action={
                    hygiene.botHumanCount > 0 ? (
                        <span className="adm-badge adm-badge-warning">
                            봇 오분류 의심 {number(hygiene.botHumanCount)}명
                        </span>
                    ) : (
                        <span className="adm-badge adm-badge-neutral">봇 오분류 0명</span>
                    )
                }
            >
                {hygiene.botHumans.length === 0 ? (
                    <AdminEmpty>봇으로 분류된 방문자 중 사람 신호를 남긴 기록이 없습니다.</AdminEmpty>
                ) : (
                    <div className="adm-table-scroll">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>visitor_id</th>
                                    <th>user_agent</th>
                                    <th className="adm-numeric">사람 신호 수</th>
                                    <th>마지막 시각</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hygiene.botHumans.map((row) => (
                                    <tr key={row.visitorId}>
                                        <td>
                                            <Link
                                                className="adm-title-link"
                                                href={`/admin/users/browsers/${encodeURIComponent(row.visitorId)}`}
                                            >
                                                <code>{row.visitorId.slice(0, 8)}</code>
                                            </Link>
                                        </td>
                                        <td>{row.userAgent ?? <span className="adm-value-zero">-</span>}</td>
                                        <td className="adm-numeric">{number(row.signalCount)}건</td>
                                        <td style={{ whiteSpace: "nowrap" }}>{adminTime(row.lastAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminPanel>

            <div className="adm-grid adm-grid-2 adm-section-space">
                <AdminPanel
                    title="client 분류별 방문자"
                    description={`${since} 이후 내부 방문 제외`}
                >
                    {hygiene.clients.length === 0 ? (
                        <AdminEmpty>기간 내 방문자가 없습니다.</AdminEmpty>
                    ) : (
                        <div className="adm-table-scroll">
                            <table className="adm-table">
                                <thead>
                                    <tr>
                                        <th>client</th>
                                        <th className="adm-numeric">visitor 수</th>
                                        <th className="adm-numeric">사람 신호 남긴 수</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hygiene.clients.map((row) => (
                                        <tr key={row.client}>
                                            <td><code>{row.client}</code></td>
                                            <td className="adm-numeric">{number(row.visitors)}명</td>
                                            <td className="adm-numeric">
                                                {ratioPeople(row.humanSignals, row.visitors)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </AdminPanel>

                <AdminPanel
                    title="최근 24시간 방문자 (최대 50명)"
                    description="외부 · 내부 · 봇 구분 및 활동 요약"
                >
                    {hygiene.recentVisitors.length === 0 ? (
                        <AdminEmpty>최근 24시간 내 방문자가 없습니다.</AdminEmpty>
                    ) : (
                        <div className="adm-table-scroll">
                            <table className="adm-table">
                                <thead>
                                    <tr>
                                        <th>visitor_id</th>
                                        <th>구분</th>
                                        <th>source</th>
                                        <th>첫 시각</th>
                                        <th>마지막 시각</th>
                                        <th className="adm-numeric">이벤트</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hygiene.recentVisitors.map((row) => {
                                        const badge = visitorKindBadge(row.kind);
                                        return (
                                            <tr key={row.visitorId}>
                                                <td>
                                                    <Link
                                                        className="adm-title-link"
                                                        href={`/admin/users/browsers/${encodeURIComponent(row.visitorId)}`}
                                                    >
                                                        <code>{row.visitorId.slice(0, 8)}</code>
                                                    </Link>
                                                </td>
                                                <td>
                                                    <span className={badge.className}>{badge.label}</span>
                                                </td>
                                                <td>{row.source ?? <span className="adm-value-zero">-</span>}</td>
                                                <td style={{ whiteSpace: "nowrap" }}>{adminTime(row.firstAt)}</td>
                                                <td style={{ whiteSpace: "nowrap" }}>{adminTime(row.lastAt)}</td>
                                                <td className="adm-numeric">{number(row.events)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </AdminPanel>
            </div>
        </div>
    );
}
