import type { PropId, StageSpec } from "@/features/stage/types";

export type Expression =
  | "neutral"
  | "happy"
  | "delighted"
  | "puzzled"
  | "awkward"
  | "stuffed"
  | "dizzy";

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
  | "wave";

export type ChoiceKind = "literal" | "context" | "natural";

export type Choice = {
  id: string;
  line: string;
  meaning: string;
  kind: ChoiceKind;
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
};

export type SceneSummary = {
  id: string;
  number: number;
  title: string;
  version: number;
};
