import { getCatalog, getScene } from "./api";
import { collectionOf, guessNext } from "./collections";
import { ScenePlayer } from "./scene-player";
import { askOf, teaserOf } from "./teaser";
import type { Scene } from "./types";

// 장면 화면을 서버에서 준비한다. 장면 주소(/scenes/n), 첫 방문 홈(/start), 특집 입구(/dev, /xmas)가 같이 쓴다
export async function SceneRoute({ scene, entry }: { scene: Scene; entry?: "home" }) {
  // 다음 장면은 collections.upNext 규칙 하나로 정한다(특집·연속극 안이면 그 모음, 아니면 안 해 본 첫 장면). 기록은 브라우저에만 있어서
  // 서버는 차례대로 해 온 사람의 다음 장면을 미리 받아 두고, 실제 기록과 다르면 장면 화면이 다시 고른다. 본문은 해시 주소로 캐시돼 있다
  const order = (await getCatalog()).map((c) => ({ id: c.id, number: c.number, collection: collectionOf(c) }));
  const guess = guessNext(order, scene.id);
  const next = guess ? await getScene(guess.id) : null;
  // 개발자 팩은 PR 단계 칩이 진행 표시라 팩 안 몇 번째인지 넘긴다
  const pack = order.filter((s) => s.collection === "dev");
  const packAt = pack.findIndex((s) => s.id === scene.id);
  return (
    <ScenePlayer
      key={scene.id}
      scene={scene}
      order={order}
      teaser={next && teaserOf(next)}
      nextAsk={next && askOf(next)}
      entry={entry}
      packStep={packAt >= 0 ? packAt + 1 : undefined}
    />
  );
}
