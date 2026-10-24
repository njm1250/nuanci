import type { Choice, Scene, Situation, Trap } from "@/features/scene/types";

export type ExpressionPair = { gist: string; wrong: string; trap?: Trap; right: string };

export type BookEntry = { id: string; number: number; title: string; relation: string; place: string; pairs: ExpressionPair[] };

// 상황마다 "이렇게 말하면 사고 나고 → 이렇게 말하면 돼요" 한 쌍을 뽑는다. 틀린 쪽은 X를 먼저, 없으면 △를 쓴다
function pair(situation: Situation): ExpressionPair | null {
  const right = situation.choices.find((c) => c.verdict === "good");
  const wrong: Choice | undefined = situation.choices.find((c) => c.verdict === "bad") ?? situation.choices.find((c) => c.verdict === "meh");
  if (!right || !wrong) return null;
  return { gist: right.meaning, wrong: wrong.line, trap: wrong.trap, right: right.line };
}

export function bookEntry(scene: Scene): BookEntry {
  const { id, number, title, relation, place } = scene;
  return { id, number, title, relation, place, pairs: [scene.base, scene.followUp].map(pair).filter((p): p is ExpressionPair => p !== null) };
}
