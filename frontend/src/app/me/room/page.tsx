import type { Metadata } from "next";
import Link from "next/link";
import { RoomView } from "@/features/account/room-view";
import { BackButton } from "@/features/collection/back-button";
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
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep md:bg-night">
      <main className="w-full max-w-[480px] bg-night px-4 pb-12 md:max-w-[1080px] md:px-8">
        <header className="flex h-12 items-center md:h-16">
          <Link href="/" className="-ml-2 flex h-11 items-center px-2 font-pixel text-[15px] text-gold">
            nuanci
          </Link>
          <BackButton fallback="/me" />
        </header>
        <h1 className="mb-4 font-pixel-title text-[24px]">아지트</h1>
        <RoomView memories={memories} />
      </main>
    </div>
  );
}
