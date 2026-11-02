import { PageShell } from "@/features/site/page-shell";
import type { Metadata } from "next";
import { RoomView } from "@/features/account/room-view";
import { bookEntry } from "@/features/collection/pairs";
import { getScene, getScenes } from "@/features/scene/api";
import type { Scene } from "@/features/scene/types";

export const metadata: Metadata = { title: "아지트 · nuanci" };

export default async function RoomPage() {
  // 물건을 얻은 장면과 그때 배운 말. 물건을 누르면 그 기억을 다시 보여준다
  const scenes = (await Promise.all((await getScenes()).map((s) => getScene(s.id)))).filter((s): s is Scene => s !== null);
  const memories = Object.fromEntries(
    scenes.map((s) => {
      const first = bookEntry(s).pairs[0];
      return [s.id, { number: s.number, title: s.title, right: first?.right ?? "" }];
    }),
  );
  return (
    <PageShell title="아지트" backFallback="/me">
      <RoomView memories={memories} />
    </PageShell>
  );
}
