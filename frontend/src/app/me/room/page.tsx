import { PageShell } from "@/features/site/page-shell";
import type { Metadata } from "next";
import { RoomView } from "@/features/account/room-view";
import { getBook } from "@/features/scene/api";

export const metadata: Metadata = { title: "아지트 · nuanci" };

export default async function RoomPage() {
  // 물건을 얻은 장면과 그때 배운 말. 물건을 누르면 그 기억을 다시 보여준다
  const memories = Object.fromEntries((await getBook()).map((e) => [e.id, { number: e.number, title: e.title, right: e.pairs[0]?.right ?? "" }]));
  return (
    <PageShell title="아지트" backFallback="/me">
      <RoomView memories={memories} />
    </PageShell>
  );
}
