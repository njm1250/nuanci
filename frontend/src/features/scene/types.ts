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
};

export type Situation = {
  context: string;
  intent: string;
  partnerLine: string;
  partnerIdle: { expression: Expression; motion: Motion; prop?: PropId };
  meIdle?: { motion: Motion; prop?: PropId };
  choices: Choice[];
  stage?: StageSpec;
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
  followUp: Situation & { prompt: string; from: string; to: string };
  discovery: string;
  ending?: Ending;
};

export type SceneSummary = {
  id: string;
  number: number;
  title: string;
  version: number;
};
