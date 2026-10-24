import type { Choice, Scene, Situation, Trap } from "@/features/scene/types";

// intent는 그때 하고 싶던 말, who·when은 누구에게 어떤 상황에서였는지. 같은 영어도 상대와 상황에 따라 달라져서, 표현만 떼어 외우지 않게 함께 남긴다
export type ExpressionPair = { intent: string; who: string; when: string; wrong: string; trap?: Trap; right: string };

export type BookEntry = { id: string; number: number; title: string; relation: string; place: string; pairs: ExpressionPair[] };

// 상황마다 "이렇게 말하면 사고 나고 → 이렇게 말하면 돼요" 한 쌍을 뽑는다. 틀린 쪽은 X를 먼저, 없으면 △를 쓴다
function pair(situation: Situation, who: string, when: string): ExpressionPair | null {
  const right = situation.choices.find((c) => c.verdict === "good");
  const wrong: Choice | undefined = situation.choices.find((c) => c.verdict === "bad") ?? situation.choices.find((c) => c.verdict === "meh");
  if (!right || !wrong) return null;
  return { intent: situation.intent, who, when, wrong: wrong.line, trap: wrong.trap, right: right.line };
}

export function bookEntry(scene: Scene): BookEntry {
  const { id, number, title, relation, place } = scene;
  const pairs = [pair(scene.base, relation, place), pair(scene.followUp, relation, scene.followUp.to)];
  return { id, number, title, relation, place, pairs: pairs.filter((p): p is ExpressionPair => p !== null) };
}

// 하고 싶던 말에서 따옴말만 꺼낸다. "괜찮아! 하고 사양하고 싶다." → "괜찮아!". 그런 꼴이 아니면 그대로 둔다
export function spoken(intent: string) {
  const i = intent.lastIndexOf(" 하고 ");
  return i > 0 ? intent.slice(0, i) : intent;
}
