import { getCatalog, getScene } from "./api";
import { shuffleChoices } from "./choice-order";
import { ScenePlayer } from "./scene-player";
import { teaserOf } from "./teaser";
import type { Scene, SceneSummary } from "./types";
import type { NextAsk } from "./wrap-up";

// 장면 화면을 서버에서 준비한다. 장면 주소(/scenes/n)와 첫 방문 홈(/start)이 같이 쓴다
export async function SceneRoute({ scene, scenes, entry }: { scene: Scene; scenes: SceneSummary[]; entry?: "home" }) {
  // 개발자 팩(category: dev)은 따로 들어오는 묶음이다. 팩 안에서는 다음 화로 잇고 10화가 끝나면 일반 장면 첫 화로 넘긴다.
  // 일반 장면에서는 팩을 건너뛰어, 전체 순서 끝에 붙은 팩이 일반 흐름에 섞이지 않게 한다
  const devIds = new Set((await getCatalog()).filter((c) => c.category === "dev").map((c) => c.id));
  const pack = scenes.filter((s) => devIds.has(s.id));
  const general = scenes.filter((s) => !devIds.has(s.id));
  const inPack = devIds.has(scene.id);
  const order = inPack ? [...pack, ...general] : general;
  // 끝난 화면의 다음 장면 예고. 다음 장면은 이 순서의 바로 다음이고(progress.nextScene과 같은 규칙), 본문은 해시 주소로 캐시돼 있다
  const nextId = order[order.findIndex((s) => s.id === scene.id) + 1]?.id;
  const next = nextId ? await getScene(nextId) : null;
  // 완료 화면 끝에 올릴 다음 장면의 첫 질문. 보기 순서는 그 장면 화면과 같게 섞는다
  const nextBase = next ? shuffleChoices(next).base : null;
  const nextAsk: NextAsk | null =
    next && nextBase ? { number: next.number, partnerName: next.partnerName, partnerLine: nextBase.partnerLine, intent: nextBase.intent, choices: nextBase.choices.map((c) => ({ id: c.id, line: c.line })) } : null;
  return (
    <ScenePlayer
      key={scene.id}
      scene={scene}
      order={order.map(({ id, number }) => ({ id, number }))}
      teaser={next && teaserOf(next)}
      nextAsk={nextAsk}
      entry={entry}
      packStep={inPack ? pack.findIndex((s) => s.id === scene.id) + 1 : undefined}
    />
  );
}
