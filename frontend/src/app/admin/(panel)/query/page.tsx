import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader, AdminLoading } from "@/features/admin/ui";
import { getAdminJson } from "@/features/admin/api";
import { QueryConsole, type QueryTable } from "./query-console";

export const metadata: Metadata = { title: "SQL 조회 · nuanci" };

async function QueryBody() {
  const tables = await getAdminJson<QueryTable[]>("/api/admin/query/schema");
  if (!tables) throw new Error("테이블 정보를 불러오지 못했어요");
  return <QueryConsole tables={tables} />;
}

export default function QueryPage() {
  return (
    <>
      <AdminHeader
        title="SQL 콘솔"
        description="스키마를 참고하면서 쿼리를 작성하고, 결과를 넓은 표로 확인합니다. 데이터 수정·삭제는 허용하지 않습니다."
      />
      <Suspense fallback={<AdminLoading />}>
        <QueryBody />
      </Suspense>
    </>
  );
}
