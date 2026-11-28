import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader, AdminLoading } from "@/features/admin/ui";
import { getAdminJson } from "@/features/admin/api";
import type { AdminChart } from "@/features/admin/chart-actions";
import { QueryConsole, type QueryTable } from "./query-console";

export const metadata: Metadata = { title: "SQL 조회 · nuanci" };

// 보드의 차트를 고치러 오면(?chart=id) 그 차트의 SQL과 설정을 불러온다. 주소를 읽는 일은 Suspense 안에서 한다
async function QueryBody({ searchParams }: { searchParams: PageProps<"/admin/query">["searchParams"] }) {
  const params = await searchParams;
  const chartId = typeof params.chart === "string" && /^\d+$/.test(params.chart) ? Number(params.chart) : null;
  const [tables, chart] = await Promise.all([
    getAdminJson<QueryTable[]>("/api/admin/query/schema"),
    chartId ? getAdminJson<AdminChart>(`/api/admin/charts/${chartId}`) : Promise.resolve(null),
  ]);
  if (!tables) throw new Error("테이블 정보를 불러오지 못했습니다");
  return <QueryConsole key={chartId ?? "new"} tables={tables} chart={chart} />;
}

export default function QueryPage(props: PageProps<"/admin/query">) {
  return (
    <>
      <AdminHeader
        title="SQL 콘솔"
        description="스키마를 참고하면서 쿼리를 작성하고, 결과를 표나 차트로 확인합니다. 지표 기준 뷰는 metrics 스키마에 있습니다. 데이터 수정·삭제는 허용하지 않습니다."
      />
      <Suspense fallback={<AdminLoading />}>
        <QueryBody searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
