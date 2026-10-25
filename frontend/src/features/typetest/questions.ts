import { getScene, getScenes } from "@/features/scene/api";
import { shuffleChoices } from "@/features/scene/choice-order";
import type { Scene } from "@/features/scene/types";
import { QUESTION_COUNT, type Step, type TestQuestion } from "./model";
import { TRAP_TYPE, type TypeId } from "./types";

// 테스트에 낼 상황(장면 id와 기본·만약에 상황). 테스트용으로 만든 장면이라 틀린 보기도 실제로 자주 고르는 말만 담았다.
// 다섯 문제의 틀린 보기 열 개가 유형 여덟 개(대답 방식·콩글리시·말 오배송·직역·K-정·교과서·팀장님·호텔 직원)를 한 번 이상 담는다.
// 여기 적은 장면이 없거나 공개되지 않았으면, 남은 자리는 아직 안 나온 함정이 많은 상황으로 자동으로 채운다
export const TEST_QUESTIONS: { scene: string; step: Step }[] = [
  { scene: "hibernation-late", step: "base" },
  { scene: "dog-influencer", step: "base" },
  { scene: "first-day-intro", step: "base" },
  { scene: "rush-hour-latte", step: "base" },
  { scene: "gym-crush", step: "base" },
];

function toQuestion(scene: Scene, step: Step): TestQuestion {
  const s = shuffleChoices(scene)[step];
  return {
    sceneId: scene.id,
    sceneNumber: scene.number,
    sceneTitle: scene.title,
    step,
    partnerName: scene.partnerName,
    partnerLine: s.partnerLine,
    intent: s.intent,
    choices: s.choices.map(({ id, line, meaning, verdict, trap, reaction }) => ({ id, line, meaning, verdict, trap, reaction })),
  };
}

// 자연스러운 답이 하나 있고 함정이 있는 상황만 문제로 쓴다
const usable = (q: TestQuestion) => q.choices.length >= 2 && q.choices.some((c) => c.verdict === "good") && q.choices.some((c) => c.trap);
const typesOf = (q: TestQuestion) => new Set<TypeId>(q.choices.flatMap((c) => (c.trap ? [TRAP_TYPE[c.trap]] : [])));

export async function getTestQuestions(): Promise<TestQuestion[]> {
  const summaries = await getScenes();
  const byId = new Map(summaries.map((s) => [s.id, s]));
  const picked: TestQuestion[] = [];
  for (const { scene: id, step } of TEST_QUESTIONS) {
    const scene = byId.has(id) ? await getScene(id) : null;
    if (!scene) continue;
    const q = toQuestion(scene, step);
    if (usable(q)) picked.push(q);
  }
  if (picked.length >= QUESTION_COUNT) return picked.slice(0, QUESTION_COUNT);

  // 모자란 자리는 아직 안 나온 유형을 가장 많이 담은 상황부터 채운다. 같은 장면에서 두 번 내지 않고, 동점이면 상대 말이 짧은 쪽(빨리 읽히는 쪽)
  const scenes = (await Promise.all(summaries.map((s) => getScene(s.id)))).filter((s): s is Scene => s !== null);
  const pool = scenes.flatMap((scene) => (["base", "followUp"] as const).map((step) => toQuestion(scene, step))).filter(usable);
  const seen = new Set<TypeId>(picked.flatMap((q) => [...typesOf(q)]));
  while (picked.length < QUESTION_COUNT) {
    const left = pool.filter((q) => !picked.some((p) => p.sceneId === q.sceneId));
    if (left.length === 0) break;
    const gain = (q: TestQuestion) => [...typesOf(q)].filter((t) => !seen.has(t)).length;
    const next = left.reduce((a, b) => (gain(b) > gain(a) || (gain(b) === gain(a) && b.partnerLine.length < a.partnerLine.length) ? b : a));
    picked.push(next);
    typesOf(next).forEach((t) => seen.add(t));
  }
  return picked;
}
