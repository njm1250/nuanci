import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminJson } from "@/features/admin/api";
import type { ClientError } from "@/features/admin/metrics-types";
import { ErrorLog } from "@/features/admin/operations-lists";
import { AdminHeader, AdminLoading } from "@/features/admin/ui";
export const metadata: Metadata = { title: "클라이언트 오류 · nuanci" };
async function Content() {
  return (
    <ErrorLog
      errors={(await getAdminJson<ClientError[]>("/api/admin/errors")) ?? []}
    />
  );
}
export default function ErrorsPage() {
  return (
    <>
      <AdminHeader
        title="클라이언트 오류"
        description="최근 100건의 오류를 메시지·발생 페이지·스택·브라우저 정보로 확인합니다."
      />
      <Suspense fallback={<AdminLoading />}>
        <Content />
      </Suspense>
    </>
  );
}
