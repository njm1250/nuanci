import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAdminJson } from "@/features/admin/api";
import { CopyId, InternalVisitorButton } from "@/features/admin/user-tools";
import {
  EVENT_LABELS,
  userHref,
  type UserDetail,
} from "@/features/admin/users-types";
import {
  AdminEmpty,
  AdminHeader,
  AdminLoading,
  AdminPanel,
  AdminStat,
  adminTime,
  number,
} from "@/features/admin/ui";

export const metadata: Metadata = { title: "유저 상세 · nuanci" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const authLabels: Record<string, string> = {
  guest: "비로그인",
  member: "로그인",
  unknown: "미상",
};
const entryLabels: Record<string, string> = {
  home: "홈",
  next: "다음 장면",
  share: "공유",
  direct: "직접",
};
const rewardReasons: Record<string, string> = { milestone: "완료 장면 수 달성", scene: "장면 기념품", bundle: "묶음 완주", box: "깜짝 상자", share: "친구 공유" };

async function Content({
  params,
  searchParams,
}: PageProps<"/admin/users/[kind]/[id]">) {
  const { kind, id } = await params;
  if ((kind !== "accounts" && kind !== "browsers") || !uuid.test(id))
    notFound();
  const p = await searchParams;
  const event =
    p.event === "choices" || p.event === "progress" ? p.event : "all";
  const query = new URLSearchParams({ event });
  if (typeof p.before === "string" && /^[1-9]\d{0,14}$/.test(p.before))
    query.set("before", p.before);
  const d = await getAdminJson<UserDetail>(
    `/api/admin/users/${kind}/${id}?${query}`,
  );
  if (!d) notFound();
  const u = d.user;
  const accounts = kind === "accounts";
  const base = userHref(kind, id);
  const incomplete = d.attempts.filter((a) => !a.completed).length;
  return (
    <>
      <AdminHeader
        title={accounts ? u.name || "이름 없는 회원" : "브라우저 상세"}
        description={
          accounts
            ? u.email || "이메일 없음"
            : "이 브라우저에 기록된 비로그인·로그인 활동을 함께 보여줍니다."
        }
        actions={
          <div className="adm-actions">
            <Link className="adm-btn" href={`/admin/users?kind=${kind}`}>
              ← 유저 목록
            </Link>
            {!accounts && (
              <InternalVisitorButton id={id} internal={u.internal} />
            )}
          </div>
        }
      />
      <div className="adm-user-identity">
        <CopyId value={id} />
        <span
          className={`adm-badge ${u.internal ? "adm-badge-warning" : "adm-badge-informative"}`}
        >
          {u.internal ? "내부 방문" : accounts ? "회원 계정" : "브라우저 ID"}
        </span>
        <span className="adm-muted">
          {accounts ? "가입" : "최초 관측"}{" "}
          {u.createdAt ? adminTime(u.createdAt) : "—"} · 최근 활동{" "}
          {u.lastAt ? adminTime(u.lastAt) : "없음"}
        </span>
      </div>
      <div className="adm-stats">
        <AdminStat
          label="완료한 장면"
          value={u.completedScenes}
          tone="positive"
          note="완료 이벤트 · 같은 장면 중복 제거"
        />
        <AdminStat
          label="장면 시도"
          value={u.attempts}
          tone="informative"
          note="시도 ID 중복 제거"
        />
        <AdminStat
          label="활동한 날짜"
          value={`${u.activityDays}일`}
          note="모든 이벤트 · 한국 시간"
        />
        <AdminStat
          label="전체 이벤트"
          value={u.events}
          note="이 상세 화면은 내부 이벤트도 포함"
        />
        <AdminStat
          label={accounts ? "활동 브라우저" : "로그인 이벤트"}
          value={accounts ? u.browsers : u.memberEvents}
          note={
            accounts
              ? "이벤트 당시 계정 ID 기준"
              : `비로그인 ${number(u.guestEvents)} · 미상 ${number(u.unknownEvents)}`
          }
        />
      </div>
      <p
        className="adm-notice adm-notice-informative"
        style={{ marginBottom: 20 }}
      >
        {accounts
          ? "회원의 이력은 이벤트 당시 로그인 계정이 확인된 기록만 표시합니다. 아래 저장된 완료·보상에는 로그인 전 기기에서 옮겨온 기록도 있을 수 있습니다."
          : "마지막으로 연결된 계정과 이벤트 당시 계정은 다를 수 있습니다. 계정 연결만으로 이전 비로그인 활동의 주인을 단정할 수 없습니다."}
      </p>
      <div className="adm-grid adm-grid-2">
        <AdminPanel
          title="최근 장면 진행"
          description={`최근 ${d.attempts.length}개 시도 · 완료 이벤트가 없는 시도 ${incomplete}개`}
        >
          <div className="adm-table-scroll" style={{ maxHeight: 390 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>장면 / 최근 활동</th>
                  <th>선택</th>
                  <th>진행 기록</th>
                </tr>
              </thead>
              <tbody>
                {d.attempts.map((a) => (
                  <tr key={`${a.id}:${a.sceneId}`}>
                    <td>
                      <Link
                        className="adm-title-link"
                        href={`/admin/metrics?scene=${encodeURIComponent(a.sceneId)}`}
                      >
                        {a.title || a.sceneId}
                      </Link>
                      <span className="adm-secondary">
                        {adminTime(a.lastAt)}
                      </span>
                      <span className="adm-secondary" title={a.id}>
                        시도 {a.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="adm-numeric">{a.choices}회</td>
                    <td>
                      <span
                        className={`adm-badge ${a.completed ? "adm-badge-success" : "adm-badge-warning"}`}
                      >
                        {a.completed ? "답변 완료" : "완료 기록 없음"}
                      </span>
                      {a.wrapped && (
                        <span className="adm-secondary">정리 화면 확인</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.attempts.length && (
              <AdminEmpty>장면 시도 기록이 없습니다.</AdminEmpty>
            )}
          </div>
          <p className="adm-muted adm-panel-body">
            완료 기록 없음은 이탈 확정이 아닙니다. 이벤트 누락이나 로그인 상태
            변경으로 기록이 나뉠 수 있습니다.
          </p>
        </AdminPanel>
        <AdminPanel
          title={accounts ? "연결된 브라우저 / 유입" : "이 브라우저의 계정"}
          description="최대 100개 · 마지막 연결과 실제 이벤트 기록을 구분합니다."
        >
          <div className="adm-table-scroll" style={{ maxHeight: 390 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{accounts ? "브라우저 / 최초 유입" : "회원"}</th>
                  <th>계정 이벤트</th>
                  <th>연결</th>
                </tr>
              </thead>
              <tbody>
                {d.connections.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        className="adm-title-link"
                        href={userHref(
                          accounts ? "browsers" : "accounts",
                          c.id,
                        )}
                      >
                        {accounts
                          ? `${c.id.slice(0, 8)}…${c.id.slice(-4)}`
                          : c.name || "이름 없음"}
                      </Link>
                      <span className="adm-secondary">
                        {accounts ? c.source || "출처 없음" : c.email || c.id}
                      </span>
                      {c.campaign && (
                        <span className="adm-secondary">
                          캠페인 {c.campaign} · {c.medium || "매체 없음"}
                        </span>
                      )}
                      {c.internal && (
                        <span className="adm-badge adm-badge-warning">
                          내부 브라우저
                        </span>
                      )}
                    </td>
                    <td className="adm-numeric">
                      {number(c.events)}
                      <span className="adm-secondary">
                        {c.lastAt ? adminTime(c.lastAt) : "이벤트 없음"}
                      </span>
                    </td>
                    <td>
                      {c.latestLink ? (
                        <span className="adm-badge adm-badge-informative">
                          마지막 연결
                        </span>
                      ) : (
                        <span className="adm-muted">과거 활동</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.connections.length && (
              <AdminEmpty>연결된 기록이 없습니다.</AdminEmpty>
            )}
          </div>
          {d.source && (
            <dl className="adm-user-source">
              {Object.entries(d.source).map(([key, value]) => (
                <div key={key}>
                  <dt>
                    {
                      {
                        source: "최초 소스",
                        medium: "매체",
                        campaign: "캠페인",
                        referrer: "리퍼러",
                      }[key]
                    }
                  </dt>
                  <dd>{value || "기록 없음"}</dd>
                </div>
              ))}
            </dl>
          )}
        </AdminPanel>
      </div>
      <AdminPanel
        title="활동 타임라인"
        description="최신순 · 페이지당 50건 · 선택 문구와 반응은 이벤트 당시 장면 버전 기준"
      >
        <div className="adm-toolbar">
          <nav className="adm-tabs" aria-label="이벤트 필터">
            {[
              ["all", "전체 이벤트"],
              ["choices", "선택 · 다른 표현"],
              ["progress", "장면 · 테스트 진행"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={`${base}?event=${value}`}
                aria-current={event === value ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          {p.before && (
            <Link
              className="adm-btn adm-btn-sm"
              href={`${base}?event=${event}`}
            >
              최신 기록으로
            </Link>
          )}
        </div>
        <div className="adm-table-scroll" style={{ maxHeight: 650 }}>
          <table className="adm-table adm-event-table">
            <thead>
              <tr>
                <th>시간 / 이벤트</th>
                <th>장면 / 시도</th>
                <th>선택한 표현 · 상대 반응</th>
                <th>당시 상태 / 유입</th>
                <th>{accounts ? "브라우저" : "계정"}</th>
              </tr>
            </thead>
            <tbody>
              {d.events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="adm-secondary">
                      {adminTime(e.createdAt)}
                    </span>
                    <strong>{EVENT_LABELS[e.type] || e.type}</strong>
                    {e.internal && (
                      <span className="adm-secondary">내부 이벤트</span>
                    )}
                  </td>
                  <td>
                    {e.sceneId ? (
                      <Link
                        href={`/admin/scenes/${encodeURIComponent(e.sceneId)}`}
                        className="adm-title-link"
                      >
                        {e.sceneTitle || e.sceneId}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {e.sceneVersion !== null && (
                      <span className="adm-secondary">
                        v{e.sceneVersion}
                        {e.step
                          ? ` · ${e.step === "base" ? "첫 상황" : "후속 상황"}`
                          : ""}
                      </span>
                    )}
                    {e.attemptId && (
                      <span className="adm-secondary" title={e.attemptId}>
                        시도 {e.attemptId.slice(0, 8)}
                      </span>
                    )}
                  </td>
                  <td>
                    {e.line ? (
                      <>
                        <span
                          className={`adm-badge ${e.verdict === "good" ? "adm-badge-success" : e.verdict === "meh" ? "adm-badge-warning" : "adm-badge-danger"}`}
                        >
                          {e.verdict === "good"
                            ? "O"
                            : e.verdict === "meh"
                              ? "△"
                              : "X"}
                        </span>{" "}
                        <span>{e.line}</span>
                        {e.reaction && (
                          <span className="adm-event-reaction">
                            “{e.reaction}”
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="adm-muted">
                        {e.choiceId ? `ID: ${e.choiceId}` : "—"}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`adm-badge ${e.authState === "member" ? "adm-badge-informative" : "adm-badge-neutral"}`}
                    >
                      {authLabels[e.authState] || e.authState}
                    </span>
                    {e.entry && (
                      <span className="adm-secondary">
                        {entryLabels[e.entry] || e.entry}
                      </span>
                    )}
                  </td>
                  <td>
                    {accounts ? (
                      <Link
                        className="adm-title-link"
                        href={userHref("browsers", e.visitorId)}
                        title={e.visitorId}
                      >
                        {e.visitorId.slice(0, 8)}…
                      </Link>
                    ) : e.userId ? (
                      <Link
                        className="adm-title-link"
                        href={userHref("accounts", e.userId)}
                      >
                        {e.accountName || e.userId.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="adm-muted">
                        {e.authState === "member" ? "계정 연결 없음" : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!d.events.length && (
            <AdminEmpty>해당하는 이벤트가 없습니다.</AdminEmpty>
          )}
        </div>
        <div className="adm-pagination">
          <span>현재 {d.events.length}건 표시</span>
          {d.nextCursor && (
            <Link
              className="adm-btn adm-btn-sm"
              href={`${base}?event=${event}&before=${d.nextCursor}`}
            >
              이전 활동 50건 →
            </Link>
          )}
        </div>
      </AdminPanel>
      <div className="adm-grid adm-grid-2 adm-section-space">
        <AdminPanel
          title="저장된 완료 기록"
          description="최근 100개 · 저장 시각은 동기화 시각일 수 있어 실제 플레이 시각과 다릅니다."
        >
          <div className="adm-table-scroll" style={{ maxHeight: 300 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>장면</th>
                  <th>저장 시각</th>
                </tr>
              </thead>
              <tbody>
                {d.savedScenes.map((s) => (
                  <tr key={s.sceneId}>
                    <td>{s.title || s.sceneId}</td>
                    <td>{adminTime(s.savedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.savedScenes.length && (
              <AdminEmpty>
                {accounts
                  ? "계정에 저장된 완료 기록이 없습니다."
                  : "이 브라우저 소유의 기록이 없습니다. 로그인 시 계정으로 옮겨졌을 수 있습니다."}
              </AdminEmpty>
            )}
          </div>
        </AdminPanel>
        <AdminPanel
          title="보상 · 완료한 날"
          description="현재 소유 보상 최근 100개 · 로그인 시 기기 보상이 계정으로 이동할 수 있습니다."
        >
          <div className="adm-table-scroll" style={{ maxHeight: 300 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>보상 / 지급 시각</th>
                  <th>지급 방식</th>
                  <th>확인</th>
                </tr>
              </thead>
              <tbody>
                {d.rewards.map((r) => (
                  <tr key={r.id}>
                    <td>
                    <strong>{r.name || r.id}</strong>
                      <span className="adm-secondary">
                        {adminTime(r.grantedAt)}
                      </span>
                      <span className="adm-secondary">
                      {r.sceneId || r.id}
                      </span>
                    </td>
                    <td>
                      {r.source === "sync" ? "기기 기록 동기화" : "플레이"}
                    <span className="adm-secondary">{rewardReasons[r.reason] || r.reason}</span>
                    </td>
                    <td>
                      <span
                        className={`adm-badge ${r.seen ? "adm-badge-neutral" : "adm-badge-warning"}`}
                      >
                        {r.seen ? "확인함" : "확인 전"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.rewards.length && (
              <AdminEmpty>이 ID가 현재 소유한 보상이 없습니다.</AdminEmpty>
            )}
          </div>
          <div className="adm-panel-body">
            <p className="adm-muted">
              서버에 저장된 장면 완료일 · 최근 기록 최대 90개
            </p>
            <div className="adm-mix-tags" style={{ marginTop: 10 }}>
              {d.activityDays.map((day) => (
                <span key={day}>{day}</span>
              ))}
              {!d.activityDays.length && <span>기록 없음</span>}
            </div>
          </div>
        </AdminPanel>
      </div>
    </>
  );
}

export default function UserPage(props: PageProps<"/admin/users/[kind]/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Content {...props} />
    </Suspense>
  );
}
