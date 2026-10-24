import type { Metadata } from "next";
import { Suspense } from "react";
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
      <h1 className="font-pixel-title text-[24px]">장면 순서</h1>
      <p className="mt-1 text-[14px] leading-relaxed text-paper-muted">
        사이트의 장면 목록과 처음 온 사람이 하는 순서예요. 화살표로 한 칸씩, 숫자를 눌러 원하는 위치로 바로 옮겨요. 공개된 장면만 사이트에 보이고, 홈 데모 영상은 공개 장면 중 앞 3개를 써요.
      </p>
      <Suspense fallback={<p className="mt-6 font-pixel text-[15px] text-paper-subtle">불러오는 중…</p>}>
        <Editor />
      </Suspense>
    </>
  );
}
