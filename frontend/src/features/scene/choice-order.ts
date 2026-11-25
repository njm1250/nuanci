import type { Scene, Situation } from "./types";

// 보기가 넷 이상인 상황도 처음에는 원래 순서의 앞 세 개만 보여 준다. 나머지는 첫 답 뒤에 붙는다
export const CORE_CHOICES = 3;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 정답 자리가 늘 같지 않도록 장면·상황마다 선택지 순서를 섞는다. 서버와 브라우저에서 같은 순서가 나오게 무작위 대신 해시를 쓴다.
// 보기 id 해시만으로 섞으면 정답이 한 자리에 몰릴 수 있어서(96문항 중 1번 39, 3번 24), 정답 자리를 먼저 정하고
// 질문 2의 정답은 질문 1과 다른 자리에 둔다. 처음 보이는 보기들끼리의 순서는 해시로 섞인 그대로 돌려서 맞춘다
export function shuffleChoices(scene: Scene): Scene {
  const firstSlot = hash(`${scene.id}:slot`) % CORE_CHOICES;
  const secondSlot = (firstSlot + 1 + (hash(`${scene.id}:slot2`) % (CORE_CHOICES - 1))) % CORE_CHOICES;
  const order = <S extends Situation>(step: string, s: S, slot: number): S => {
    const key = (id: string) => hash(`${scene.id}:${step}:${id}`);
    const sorted = [...s.choices].sort((a, b) => key(a.id) - key(b.id));
    const coreIds = new Set(s.choices.slice(0, CORE_CHOICES).map((c) => c.id));
    const coreAt = sorted.flatMap((c, i) => (coreIds.has(c.id) ? [i] : []));
    const core = coreAt.map((i) => sorted[i]);
    const good = core.findIndex((c) => c.verdict === "good");
    if (good < 0 || core.length !== CORE_CHOICES) return { ...s, choices: sorted };
    const shift = (good - slot + CORE_CHOICES) % CORE_CHOICES;
    coreAt.forEach((at, i) => {
      sorted[at] = core[(i + shift) % CORE_CHOICES];
    });
    return { ...s, choices: sorted };
  };
  return { ...scene, base: order("base", scene.base, firstSlot), followUp: order("followUp", scene.followUp, secondSlot) };
}
