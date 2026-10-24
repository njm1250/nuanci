import type { Metadata } from "next";
import Link from "next/link";
import { getScene, getScenes } from "@/features/scene/api";
import type { Scene } from "@/features/scene/types";
import { SceneGrid } from "@/features/landing/landing-progress";

export const metadata: Metadata = { title: "영어 상황별 대화 게임 전체 장면 · nuanci", description: "친구·룸메이트·회사 동료와의 상황에서 하고 싶은 말을 영어로 골라 보세요. 선택에 따라 달라지는 상대 반응으로 영어 뉘앙스를 익혀요.", alternates: { canonical: "/scenes" } };

export default async function ScenesPage() {
  const summaries = await getScenes();
  const scenes = (await Promise.all(summaries.map((s) => getScene(s.id)))).filter((s): s is Scene => s !== null);
  const shelf = scenes.map(({ id, number, title, relation, place, base }) => ({ id, number, title, relation, place, stage: base.stage }));
  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep">
      <main className="w-full max-w-[480px] bg-night px-4 pb-12 md:max-w-[1080px] md:px-8">
        <header className="flex h-12 items-center md:h-16">
          <Link href="/" className="-ml-2 flex h-11 items-center px-2 font-pixel text-[15px] text-paper">
            <span className="hl">nuanci</span>
          </Link>
        </header>
        <h1 className="font-pixel-title text-[24px]">전체 장면</h1>
        <div className="mt-3">
          <SceneGrid scenes={shelf} />
        </div>
      </main>
    </div>
  );
}
