import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminJson } from "@/features/admin/api";
import type { Inquiry } from "@/features/admin/metrics-types";
import { InquiryInbox } from "@/features/admin/operations-lists";
import { AdminHeader, AdminLoading } from "@/features/admin/ui";
export const metadata: Metadata = { title: "문의 · 제보 · nuanci" };
async function Content() {
  return (
    <InquiryInbox
      inquiries={(await getAdminJson<Inquiry[]>("/api/admin/inquiries")) ?? []}
    />
  );
}
export default function InquiriesPage() {
  return (
    <>
      <AdminHeader
        title="문의 · 제보"
        description="처리 전 문의를 우선 표시하며 최대 200건을 조회합니다. 시각은 한국 시간 기준입니다."
      />
      <Suspense fallback={<AdminLoading />}>
        <Content />
      </Suspense>
    </>
  );
}
