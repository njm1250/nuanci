import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminJson } from "@/features/admin/api";
import type { Metrics } from "@/features/admin/metrics-types";
import { MetricsDashboard } from "@/features/admin/metrics-dashboard";
import { AdminHeader, AdminLoading } from "@/features/admin/ui";

export const metadata: Metadata = { title: "이용 지표 · nuanci" };

async function Content({ searchParams }: PageProps<"/admin/metrics">) {
  const params = await searchParams;
  const audience =
    typeof params.audience === "string" &&
    ["guest", "member", "unknown"].includes(params.audience)
      ? params.audience
      : "all";
  const period =
    typeof params.period === "string" &&
    ["today", "7d", "30d", "90d"].includes(params.period)
      ? params.period
      : "all";
  const metrics = await getAdminJson<Metrics>(
    `/api/admin/metrics?audience=${audience}&period=${period}`,
  );
  if (!metrics) throw new Error("지표를 불러오지 못했습니다.");
  const initialScene =
    typeof params.scene === "string" ? params.scene : undefined;
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <nav className="adm-tabs" aria-label="이벤트 당시 로그인 상태">
          {[
            ["all", "전체"],
            ["guest", "비로그인"],
            ["member", "로그인"],
            ["unknown", "과거 기록"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={`/admin/metrics?audience=${value}&period=${period}`}
              aria-current={audience === value ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className="adm-muted">
          탭별 브라우저 수를 합산하면 중복됩니다.
        </span>
      </div>
      <div className="adm-toolbar-group" style={{ marginBottom: 20 }}>
        <nav className="adm-tabs" aria-label="지표 집계 기간">
          {[
            ["today", "오늘"],
            ["7d", "7일"],
            ["30d", "30일"],
            ["90d", "90일"],
            ["all", "전체 기간"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={`/admin/metrics?audience=${audience}&period=${value}${initialScene ? `&scene=${encodeURIComponent(initialScene)}` : ""}`}
              aria-current={period === value ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className="adm-muted">한국 시간 · 오늘 포함 · 현재 시각까지</span>
      </div>
      <MetricsDashboard
        key={`${audience}:${period}`}
        metrics={metrics}
        initialScene={initialScene}
      />
    </>
  );
}

export default function MetricsPage(props: PageProps<"/admin/metrics">) {
  return (
    <>
      <AdminHeader
        title="이용 지표"
        description="브라우저·계정·장면 시도를 구분하고, 유입부터 선택지 반응까지 살펴보세요."
      />
      <Suspense fallback={<AdminLoading />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
