import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminJson, getAdminScenes } from "@/features/admin/api";
import type {
  Metrics,
  Inquiry,
  ClientError,
} from "@/features/admin/metrics-types";
import {
  AdminEmpty,
  AdminHeader,
  AdminLoading,
  AdminPanel,
  AdminStat,
  adminTime,
  number,
  percent,
} from "@/features/admin/ui";

export const metadata: Metadata = { title: "운영 대시보드 · nuanci" };

async function Dashboard() {
  const [metrics, scenes, inquiries, errors] = await Promise.all([
    getAdminJson<Metrics>("/api/admin/metrics"),
    getAdminScenes(),
    getAdminJson<Inquiry[]>("/api/admin/inquiries"),
    getAdminJson<ClientError[]>("/api/admin/errors"),
  ]);
  if (!metrics) throw new Error("운영 현황을 불러오지 못했습니다.");
  const pending = (inquiries ?? []).filter((q) => !q.done);
  const warnings = scenes.filter((s) => s.warnings.length);
  const ranking = [...metrics.scenes]
    .sort((a, b) => b.viewed - a.viewed)
    .slice(0, 8);
  const stats = [
    ["장면 시작", metrics.funnel.started],
    ["첫 선택", metrics.funnel.firstPick],
    ["답변 완료", metrics.funnel.answered],
    ["정리 화면", metrics.funnel.wrapped],
    ["다음 장면 클릭", metrics.funnel.next],
  ] as const;
  return (
    <>
      <div className="adm-stats">
        <AdminStat
          label="고유 브라우저"
          tone="informative"
          value={metrics.visitors}
          note="내부 브라우저 제외 · 누적"
        />
        <AdminStat
          label="활동한 로그인 계정"
          value={metrics.activeAccounts}
          note={`가입 계정 ${number(metrics.registeredAccounts)}개 · 누적`}
        />
        <AdminStat
          label="장면 시도"
          value={metrics.attempts}
          note={`이벤트 ${number(metrics.events)}건`}
        />
        <AdminStat
          label="공개 장면"
          tone="positive"
          value={scenes.filter((s) => s.status === "published").length}
          note={`전체 ${scenes.length}개 · 초안 ${scenes.filter((s) => s.status === "draft").length}개`}
        />
        <AdminStat
          label="처리 전 문의"
          tone={pending.length ? "warning" : "neutral"}
          value={pending.length}
          note="현재 조회된 최근 문의 기준"
        />
      </div>
      <div className="adm-grid adm-grid-2">
        <AdminPanel
          title="장면 이용 현황"
          description="각 단계에 도달한 고유 브라우저 · 누적"
          action={
            <Link className="adm-btn adm-btn-sm" href="/admin/metrics">
              상세 분석 →
            </Link>
          }
        >
          <div className="adm-panel-body">
            {stats.map(([label, n]) => (
              <div
                className="adm-funnel-row"
                key={label}
                data-tone={label === "답변 완료" ? "positive" : "informative"}
              >
                <span>{label}</span>
                <div className="adm-bar">
                  <span
                    style={{
                      width: `${percent(n, Math.max(...stats.map(([, v]) => v), 1))}%`,
                    }}
                  />
                </div>
                <strong>{number(n)}</strong>
                <small>브라우저</small>
              </div>
            ))}
            <p className="adm-muted" style={{ marginTop: 14 }}>
              단계별 집계이므로 동일 집단의 순차 전환율을 뜻하지 않습니다.
            </p>
          </div>
        </AdminPanel>
        <AdminPanel
          title="운영 체크"
          description="콘텐츠와 사용자 피드백에서 확인할 항목"
        >
          <div className="adm-compact-list">
            <Link href="/admin/inquiries">
              <span>처리 전 문의 · 제보</span>
              <span
                className={`adm-badge ${pending.length ? "adm-badge-warning" : "adm-badge-neutral"}`}
              >
                {pending.length}건 →
              </span>
            </Link>
            <Link href="/admin/errors">
              <span>최근 수집된 클라이언트 오류</span>
              <span
                className={`adm-badge ${errors?.length ? "adm-badge-danger" : "adm-badge-neutral"}`}
              >
                {errors?.length ?? 0}건 · 최대 100건 →
              </span>
            </Link>
            <Link href="/admin/scenes">
              <span>검수 경고가 있는 장면</span>
              <span
                className={`adm-badge ${warnings.length ? "adm-badge-warning" : "adm-badge-neutral"}`}
              >
                {warnings.length}개 →
              </span>
            </Link>
            <Link href="/admin/scenes">
              <span>공개 대기 초안</span>
              <span className="adm-badge adm-badge-neutral">
                {scenes.filter((s) => s.status === "draft").length}개 →
              </span>
            </Link>
          </div>
          <div className="adm-panel-body">
            <p className="adm-notice adm-notice-informative">
              고유 브라우저는 사람 수가 아닙니다. 기기·브라우저·시크릿 창이
              달라지면 새 ID로 잡힐 수 있으며 자동화 접속도 포함될 수 있습니다.
            </p>
          </div>
        </AdminPanel>
      </div>
      <div className="adm-grid adm-grid-2">
        <AdminPanel
          title="많이 열린 장면"
          description="노출·완료는 장면 시도 기준 · 누적"
          action={
            <Link href="/admin/metrics" className="adm-btn adm-btn-sm">
              전체 장면 →
            </Link>
          }
        >
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>장면</th>
                  <th className="adm-numeric">노출</th>
                  <th className="adm-numeric">완료</th>
                  <th className="adm-numeric">완료 / 노출</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link
                        className="adm-title-link"
                        href={`/admin/metrics?scene=${encodeURIComponent(s.id)}`}
                      >
                        #{s.number} {s.title}
                      </Link>
                    </td>
                    <td className="adm-numeric">{number(s.viewed)}</td>
                    <td className="adm-numeric">{number(s.completed)}</td>
                    <td className="adm-numeric">
                      {s.viewed ? `${percent(s.completed, s.viewed)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
        <AdminPanel
          title="최근 문의 · 제보"
          action={
            <Link href="/admin/inquiries" className="adm-btn adm-btn-sm">
              문의함 →
            </Link>
          }
        >
          <div className="adm-compact-list">
            {(inquiries ?? [])
              .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 5)
              .map((q) => (
                <Link href={`/admin/inquiries#inquiry-${q.id}`} key={q.id}>
                  <div>
                    <p>
                      {q.message.length > 100
                        ? `${q.message.slice(0, 100)}…`
                        : q.message}
                    </p>
                    <span className="adm-secondary">
                      {adminTime(q.createdAt)}
                    </span>
                  </div>
                  <span
                    className={`adm-badge ${q.done ? "adm-badge-neutral" : "adm-badge-warning"}`}
                  >
                    {q.done ? "처리함" : "처리 전"}
                  </span>
                </Link>
              ))}
          </div>
          {!inquiries?.length && (
            <AdminEmpty>접수된 문의가 없습니다.</AdminEmpty>
          )}
        </AdminPanel>
      </div>
      <p className="adm-muted">
        이용 지표는 누적 데이터입니다. 내부 브라우저 {metrics.internalVisitors}
        개의 이벤트 {number(metrics.internalEvents)}건은 이용 지표에서
        제외했습니다.
      </p>
    </>
  );
}

export default function OverviewPage() {
  return (
    <>
      <AdminHeader
        title="운영 대시보드"
        description="이용 현황, 콘텐츠 상태와 확인할 피드백을 한눈에 살펴보세요."
        actions={
          <Link href="/admin/scenes/new" className="adm-btn adm-btn-primary">
            ＋ 새 장면 등록
          </Link>
        }
      />
      <Suspense fallback={<AdminLoading />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
