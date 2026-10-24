import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminJson } from "@/features/admin/api";
import { QueryConsole, type QueryTable } from "./query-console";

export const metadata: Metadata = { title: "SQL 조회 · nuanci" };

async function QueryBody() {
  const tables = await getAdminJson<QueryTable[]>("/api/admin/query/schema");
  if (!tables) throw new Error("테이블 정보를 불러오지 못했어요");
  return <QueryConsole tables={tables} />;
}

export default function QueryPage() {
  return <>
    <h1 className="font-pixel-title text-[24px]">SQL 조회</h1>
    <p className="mt-2 text-[14px] leading-relaxed text-paper-muted">SELECT·WITH 조회 한 문장만 실행해요. 최대 500행·100컬럼, 실행 시간 5초. 긴 값은 셀당 4,000자까지 표시해요. 결과가 크면 일부 행만 표시해요.</p>
    <Suspense fallback={<p className="mt-6">테이블 불러오는 중…</p>}><QueryBody /></Suspense>
  </>;
}
