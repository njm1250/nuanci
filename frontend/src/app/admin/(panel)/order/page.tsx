import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader, AdminLoading } from "@/features/admin/ui";
import { getAdminScenes } from "@/features/admin/api";
import { OrderEditor } from "@/features/admin/order-editor";

export const metadata: Metadata = { title: "장면 순서 · nuanci" };

async function Editor() {
  const scenes = (await getAdminScenes()).sort((a, b) => a.order - b.order);
  return <OrderEditor scenes={scenes} />;
}

export default function OrderPage() {
  return (
    <>
      <AdminHeader
        title="노출 순서"
        description="공개 장면이 서비스에 나오는 순서입니다. 위치 번호를 선택하면 멀리 있는 장면도 한 번에 옮길 수 있습니다."
      />
      <Suspense fallback={<AdminLoading />}>
        <Editor />
      </Suspense>
    </>
  );
}
