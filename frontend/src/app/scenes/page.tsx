import type { Metadata } from "next";
import { getScene, getScenes } from "@/features/scene/api";
import type { Scene } from "@/features/scene/types";
import { SceneGrid } from "@/features/landing/landing-progress";
import { PageShell } from "@/features/site/page-shell";

export const metadata: Metadata = { title: "영어 상황별 대화 게임 전체 장면 · nuanci", description: "친구·룸메이트·회사 동료와의 상황에서 하고 싶은 말을 영어로 골라 보세요. 선택에 따라 달라지는 상대 반응으로 영어 뉘앙스를 익혀요.", alternates: { canonical: "/scenes" } };

export default async function ScenesPage() {
  const summaries = await getScenes();
  const scenes = (await Promise.all(summaries.map((s) => getScene(s.id)))).filter((s): s is Scene => s !== null);
  const shelf = scenes.map(({ id, number, title, relation, place, base }) => ({ id, number, title, relation, place, stage: base.stage }));
  return (
    <PageShell title="전체 장면" note="어디서부터 해 볼까요" back={false}>
      <SceneGrid scenes={shelf} />
    </PageShell>
  );
}
