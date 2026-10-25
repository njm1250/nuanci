import type { PropId, StageSpec } from "@/features/stage/types";

export type Expression =
  | "neutral"
  | "happy"
  | "delighted"
  | "puzzled"
  | "awkward"
  | "stuffed"
  | "dizzy"
  | "love"
  | "angry"
  | "shocked"
  | "sleepy"
  | "crying";

export type Motion =
  | "idle"
  | "nod"
  | "tilt"
  | "bounce"
  | "shrug"
  | "patBelly"
  | "lean"
  | "faint"
  | "flop"
  | "spin"
  | "shiver"
  | "aim"
  | "point"
  | "facepalm"
  | "wave"
  | "bow"
  | "clap"
  | "sob"
  | "dance"
  | "panic";

// 판정은 들었을 때 어떤지(O / △ / X), 함정은 왜 어색한지다. 자연스러운 말에는 함정이 없다
export type Verdict = "good" | "meh" | "bad";

export type Trap = "literal" | "konglish" | "answer" | "textbook" | "blunt" | "formal" | "context" | "misread" | "culture";

export const TRAP_LABELS: Record<Trap, string> = {
  literal: "직역",
  konglish: "콩글리시",
  answer: "대답 방식",
  textbook: "교과서식",
  blunt: "너무 직설적",
  formal: "너무 격식",
  context: "맥락 어긋남",
  misread: "다른 뜻으로 들림",
  culture: "문화 차이",
};

export type Choice = {
  id: string;
  line: string;
  meaning: string;
  verdict: Verdict;
  trap?: Trap;
  reaction: string;
  tags: string[];
  why: string;
  detail: string;
  expression: Expression;
  motion: Motion;
  meMotion?: Motion;
  meProp?: PropId;
  partnerProp?: PropId;
  flags?: string[];
  // 상대가 이 말을 듣고 머릿속에 떠올린 엉뚱한 그림. 고른 직후 생각 말풍선으로 잠깐 보여준다
  imagine?: { icon: string; caption: string };
  // 자연스러운 말의 핵심 표현이 실제로 실린 곳. 예: "Cambridge Dictionary · on the house". 직접 확인한 것만 적는다
  source?: string;
};

// 질문 전에 저절로 흘러가는 대사 한 줄. 기본 상황에서는 빌드업, 만약에 상황에서는 앞 장면과 잇는 대사다.
// 말하는 사람의 동작·소품을 붙일 수 있고, flags는 그 줄부터 이 상황이 끝날 때까지 무대에 남는다(냉장고가 비어 있음 등)
export type Beat = { who: "partner" | "me" | "mochi"; line: string; meaning: string; motion?: Motion; prop?: PropId; flags?: string[] };

export type Situation = {
  context: string;
  intent: string;
  partnerLine: string;
  partnerIdle: { expression: Expression; motion: Motion; prop?: PropId };
  meIdle?: { motion: Motion; prop?: PropId };
  choices: Choice[];
  stage?: StageSpec;
  lead?: Beat[];
};

// 장면을 다 본 뒤 무대에서 저절로 재생되는 마지막 한 컷. 상대나 Mochi가 상황을 한 단계 더 키우는 한마디를 던진다
export type Ending = {
  who: "partner" | "mochi";
  line: string;
  meaning: string;
  motion?: Motion;
};

export type Scene = {
  id: string;
  version: number;
  number: number;
  title: string;
  relation: string;
  place: string;
  partnerName: string;
  base: Situation;
  // time이 있으면 "만약에" 대신 시간이 흐른 이어지는 장면("10분 뒤")으로 보여준다
  followUp: Situation & { prompt: string; from: string; to: string; time?: string };
  discovery: string;
  ending?: Ending;
};

export type SceneSummary = {
  id: string;
  number: number;
  title: string;
  version: number;
};
