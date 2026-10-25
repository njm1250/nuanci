import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminJson } from "@/features/admin/api";
import type { UserDirectory, UserKind } from "@/features/admin/users-types";
import { userHref } from "@/features/admin/users-types";
import {
  AdminEmpty,
  AdminHeader,
  AdminLoading,
  AdminPanel,
  AdminStat,
  adminTime,
  number,
} from "@/features/admin/ui";

export const metadata: Metadata = { title: "유저 탐색 · nuanci" };
const scalar = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : "";

async function Content({ searchParams }: PageProps<"/admin/users">) {
  const p = await searchParams;
  const kind: UserKind = p.kind === "browsers" ? "browsers" : "accounts";
  const q = scalar(p.q).slice(0, 200);
  const activity = [
    "active7",
    "inactive7",
    "no_completion",
    "returning",
  ].includes(scalar(p.activity))
    ? scalar(p.activity)
    : "all";
  const sort = ["created", "completed", "events"].includes(scalar(p.sort))
    ? scalar(p.sort)
    : "recent";
  const includeInternal = p.includeInternal === "true";
  const parsedPage = Number(scalar(p.page));
  const page =
    Number.isInteger(parsedPage) && parsedPage > 0
      ? Math.min(parsedPage, 100000)
      : 1;
  const query = new URLSearchParams({
    kind,
    q,
    activity,
    sort,
    includeInternal: String(includeInternal),
    page: String(page),
  });
  const data = await getAdminJson<UserDirectory>(`/api/admin/users?${query}`);
  if (!data) throw new Error("유저 목록을 불러오지 못했습니다.");
  const href = (values: Record<string, string>) => {
    const next = new URLSearchParams(query);
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    return `/admin/users?${next}`;
  };
  const accounts = kind === "accounts";
  const label = accounts ? "계정" : "브라우저";
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <>
      <div className="adm-toolbar-group" style={{ marginBottom: 20 }}>
        <nav className="adm-tabs" aria-label="유저 식별 기준">
          <Link
            href={href({ kind: "accounts", page: "1" })}
            aria-current={accounts ? "page" : undefined}
          >
            회원 계정
          </Link>
          <Link
            href={href({ kind: "browsers", page: "1" })}
            aria-current={!accounts ? "page" : undefined}
          >
            브라우저
          </Link>
        </nav>
        <span className="adm-muted">
          {includeInternal ? "내부 방문 포함" : "내부 방문 제외"} · 숫자는 현재
          검색·필터 기준
        </span>
      </div>
      <div className="adm-stats adm-stats-four">
        <AdminStat
          label={`조회된 ${label}`}
          value={data.total}
          tone="informative"
          note={
            accounts
              ? "가입했지만 이벤트가 없는 계정도 포함"
              : "이벤트·로그인 연결이 있는 ID"
          }
        />
        <AdminStat
          label="최근 7일 활동"
          value={data.active7}
          tone="positive"
          note="최근 168시간 내 이벤트가 있음"
        />
        <AdminStat
          label="시도했지만 완료 기록 없음"
          value={data.noCompletion}
          tone="warning"
          note="전체 관측 기간에 답변 완료 0개"
        />
        <AdminStat
          label="서로 다른 날 이용"
          value={data.returning}
          note="전체 관측 기간 중 KST 2일 이상"
        />
      </div>
      <AdminPanel
        title={accounts ? "회원 계정" : "브라우저 활동"}
        description="이름이나 ID를 누르면 선택한 표현, 장면 진행, 보상과 연결 정보를 볼 수 있습니다."
      >
        <form
          action="/admin/users"
          className="adm-toolbar"
          key={query.toString()}
        >
          <input type="hidden" name="kind" value={kind} />
          <div className="adm-toolbar-group">
            <input
              className="adm-input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder={
                accounts ? "이름 · 이메일 · 계정 ID" : "브라우저 ID · 유입 경로"
              }
              aria-label="유저 검색"
              maxLength={200}
            />
            <select
              className="adm-select"
              name="activity"
              defaultValue={activity}
              aria-label="활동 필터"
            >
              <option value="all">모든 활동</option>
              <option value="active7">최근 7일 활동</option>
              <option value="inactive7">7일간 활동 없음</option>
              <option value="no_completion">완료 기록 없음</option>
              <option value="returning">서로 다른 날 이용</option>
            </select>
            <select
              className="adm-select"
              name="sort"
              defaultValue={sort}
              aria-label="유저 정렬"
            >
              <option value="recent">최근 활동순</option>
              <option value="created">
                {accounts ? "최근 가입순" : "최초 관측 최신순"}
              </option>
              <option value="completed">완료 장면순</option>
              <option value="events">이벤트 많은 순</option>
            </select>
            <label className="adm-filter-check">
              <input
                type="checkbox"
                name="includeInternal"
                value="true"
                defaultChecked={includeInternal}
              />{" "}
              내부 포함
            </label>
            <button className="adm-btn adm-btn-primary" type="submit">
              조회
            </button>
            <Link
              className="adm-btn adm-btn-plain"
              href={`/admin/users?kind=${kind}`}
            >
              초기화
            </Link>
          </div>
        </form>
        <div className="adm-table-scroll">
          <table className="adm-table" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th>{accounts ? "회원" : "브라우저 ID / 최초 유입"}</th>
                <th>{accounts ? "가입일" : "최초 관측"}</th>
                <th>최근 활동</th>
                <th className="adm-numeric">이용일</th>
                <th className="adm-numeric">시도</th>
                <th className="adm-numeric">완료 장면</th>
                <th className="adm-numeric">이벤트</th>
                <th>{accounts ? "활동 브라우저" : "이벤트 당시 상태"}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link
                      className="adm-title-link"
                      href={userHref(kind, u.id)}
                    >
                      {accounts
                        ? u.name || "이름 없음"
                        : `${u.id.slice(0, 8)}…${u.id.slice(-4)}`}
                      {u.internal && (
                        <span
                          className="adm-badge adm-badge-warning"
                          style={{ marginLeft: 8 }}
                        >
                          내부
                        </span>
                      )}
                      <span className="adm-secondary">
                        {accounts
                          ? u.email || "이메일 없음"
                          : u.source || "출처 없음"}
                      </span>
                      {accounts && (
                        <span className="adm-secondary">{u.id}</span>
                      )}
                    </Link>
                  </td>
                  <td>{u.createdAt ? adminTime(u.createdAt) : "—"}</td>
                  <td>
                    {u.lastAt ? (
                      adminTime(u.lastAt)
                    ) : (
                      <span className="adm-muted">이벤트 없음</span>
                    )}
                  </td>
                  <td className="adm-numeric">{number(u.activityDays)}일</td>
                  <td className="adm-numeric">{number(u.attempts)}</td>
                  <td
                    className={`adm-numeric ${u.completedScenes ? "adm-value-positive" : "adm-value-zero"}`}
                  >
                    {number(u.completedScenes)}
                  </td>
                  <td className="adm-numeric">{number(u.events)}</td>
                  <td>
                    {accounts ? (
                      `${u.browsers}개`
                    ) : (
                      <div className="adm-toolbar-group">
                        {u.guestEvents > 0 && (
                          <span className="adm-badge adm-badge-neutral">
                            비로그인 {u.guestEvents}
                          </span>
                        )}
                        {u.memberEvents > 0 && (
                          <span className="adm-badge adm-badge-informative">
                            로그인 {u.memberEvents}
                          </span>
                        )}
                        {u.unknownEvents > 0 && (
                          <span className="adm-badge adm-badge-warning">
                            미상 {u.unknownEvents}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.rows.length && (
            <AdminEmpty>
              조건에 맞는 {label}이 없습니다. 검색어나 활동 필터를 바꿔보세요.
            </AdminEmpty>
          )}
        </div>
        <div className="adm-pagination">
          <span>
            총 {number(data.total)}개 · {data.page} / {pages}페이지 · 50개씩
          </span>
          <div className="adm-toolbar-group">
            {data.page > 1 && (
              <Link
                className="adm-btn adm-btn-sm"
                href={href({ page: String(data.page - 1) })}
              >
                ← 이전
              </Link>
            )}
            {data.page < pages && (
              <Link
                className="adm-btn adm-btn-sm"
                href={href({ page: String(data.page + 1) })}
              >
                다음 →
              </Link>
            )}
          </div>
        </div>
      </AdminPanel>
      <p className="adm-notice adm-section-space">
        {accounts
          ? "회원 활동 수치는 이벤트 발생 당시 해당 계정으로 로그인한 기록만 집계합니다. 로그인 전 기록과 기기에서 동기화한 완료 기록은 활동 수치에 합치지 않습니다. 내부 계정은 현재 내부 브라우저에 연결된 계정입니다."
          : "브라우저 목록에는 이벤트 또는 로그인 연결이 있는 ID를 표시합니다. 최초 관측은 첫 이벤트, 없으면 현재 연결 시각입니다. 브라우저 ID는 사람 수가 아닙니다. 시크릿 모드·다른 기기는 별개로 잡히며, 여러 사람이 같은 브라우저를 쓸 수도 있습니다. 비로그인·로그인 숫자는 각각 이벤트 건수입니다."}
      </p>
    </>
  );
}

export default function UsersPage(props: PageProps<"/admin/users">) {
  return (
    <>
      <AdminHeader
        title="유저 탐색"
        description="누가 이용하고, 어디서 멈추고, 다시 찾아오는지 실제 활동 기록으로 확인하세요."
      />
      <Suspense fallback={<AdminLoading />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
