import { getScene } from "./api";
import { shuffleChoices } from "./choice-order";
import { ScenePlayer } from "./scene-player";
import { teaserOf } from "./teaser";
import type { Scene, SceneSummary } from "./types";
import type { NextAsk } from "./wrap-up";

// 장면 화면을 서버에서 준비한다. 장면 주소(/scenes/n)와 첫 방문 홈(/start)이 같이 쓴다
export async function SceneRoute({ scene, scenes, entry }: { scene: Scene; scenes: SceneSummary[]; entry?: "home" }) {
  // 끝난 화면의 다음 장면 예고. 다음 장면은 목록의 바로 다음이고(progress.nextScene과 같은 규칙), 본문은 해시 주소로 캐시돼 있다
  const nextId = scenes[scenes.findIndex((s) => s.id === scene.id) + 1]?.id;
  const next = nextId ? await getScene(nextId) : null;
  // 완료 화면 끝에 올릴 다음 장면의 첫 질문. 보기 순서는 그 장면 화면과 같게 섞는다
  const nextBase = next ? shuffleChoices(next).base : null;
  const nextAsk: NextAsk | null =
    next && nextBase ? { number: next.number, partnerName: next.partnerName, partnerLine: nextBase.partnerLine, intent: nextBase.intent, choices: nextBase.choices.map((c) => ({ id: c.id, line: c.line })) } : null;
  return <ScenePlayer key={scene.id} scene={scene} order={scenes.map(({ id, number }) => ({ id, number }))} teaser={next && teaserOf(next)} nextAsk={nextAsk} entry={entry} />;
}
