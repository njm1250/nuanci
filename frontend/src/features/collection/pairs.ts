import type { Choice, Scene, Situation, Trap } from "@/features/scene/types";

// intent는 그때 하고 싶던 말, who·when은 누구에게 어떤 상황에서였는지. 같은 영어도 상대와 상황에 따라 달라져서, 표현만 떼어 외우지 않게 함께 남긴다
export type ExpressionPair = { intent: string; who: string; when: string; wrong: string; trap?: Trap; right: string; alts: string[]; sources: Situation["sources"] };

export type BookEntry = { id: string; number: number; title: string; relation: string; place: string; pairs: ExpressionPair[] };

// 상황마다 "이렇게 말하면 사고 나고 → 이렇게 말하면 돼요" 한 쌍을 뽑는다. 틀린 쪽은 X를 먼저, 없으면 △를 쓴다.
// 자연스러운 말이 둘 이상이면 내가 고른 말을 앞에 둔다. 다른 말을 앞세우면 내 답이 틀린 것처럼 보인다
function pair(situation: Situation, who: string, when: string, picked: string[] = []): ExpressionPair | null {
  const goods = situation.choices.filter((c) => c.verdict === "good");
  const right = goods.find((c) => picked.includes(c.id)) ?? goods[0];
  const wrong: Choice | undefined = situation.choices.find((c) => c.verdict === "bad") ?? situation.choices.find((c) => c.verdict === "meh");
  if (!right || !wrong) return null;
  const alts = situation.choices.filter((c) => c.verdict === "good" && c !== right).map((c) => c.line);
  return { intent: situation.intent, who, when, wrong: wrong.line, trap: wrong.trap, right: right.line, alts, sources: situation.sources };
}

export function bookEntry(scene: Scene, picked: string[] = []): BookEntry {
  const { id, number, title, relation, place } = scene;
  const pairs = [pair(scene.base, relation, place, picked), pair(scene.followUp, relation, scene.followUp.to, picked)];
  return { id, number, title, relation, place, pairs: pairs.filter((p): p is ExpressionPair => p !== null) };
}

// 하고 싶던 말에서 따옴말만 꺼낸다. "괜찮아! 하고 사양하고 싶다." → "괜찮아!". 그런 꼴이 아니면 그대로 둔다
export function spoken(intent: string) {
  const i = intent.lastIndexOf(" 하고 ");
  return i > 0 ? intent.slice(0, i) : intent;
}

// 하고 싶던 말을 화면에 옮길 때 쓴다. 따옴말이 있으면 「」로 감싸고, "~라고 알려 주고 싶다"처럼 서술만 있으면 따옴표 없이 문장 그대로 둔다
export function quotedIntent(intent: string) {
  return intent.lastIndexOf(" 하고 ") > 0 ? `「${spoken(intent)}」` : intent;
}
