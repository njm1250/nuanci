import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminJson } from "@/features/admin/api";
import { ProgressionEditor } from "@/features/admin/progression-editor";
import { AdminHeader, AdminLoading } from "@/features/admin/ui";
import type { ProgressionAdmin } from "@/features/progression/types";

export const metadata: Metadata = { title: "운영 설정 · nuanci" };

async function Content() {
  const data = await getAdminJson<ProgressionAdmin>(
    "/api/admin/settings/progression",
  );
  if (!data) throw new Error("운영 설정을 불러오지 못했습니다.");
  return <ProgressionEditor initial={data} />;
}

export default function SettingsPage() {
  return (
    <>
      <AdminHeader
        title="운영 설정"
        description="직급과 보상 기준을 조절합니다. 저장한 설정은 DB에 보관되며 재배포 없이 적용됩니다."
      />
      <Suspense fallback={<AdminLoading />}>
        <Content />
      </Suspense>
    </>
  );
}
