import type { StageSpec } from "@/features/stage/types";

export type Expression =
  | "neutral"
  | "happy"
  | "delighted"
  | "puzzled"
  | "awkward"
  | "stuffed";

export type Motion =
  | "idle"
  | "nod"
  | "tilt"
  | "bounce"
  | "shrug"
  | "patBelly"
  | "lean";

export type Choice = {
  id: string;
  line: string;
  meaning: string;
  reaction: string;
  tags: string[];
  why: string;
  detail: string;
  expression: Expression;
  motion: Motion;
  flags?: string[];
};

export type Situation = {
  context: string;
  intent: string;
  partnerLine: string;
  partnerIdle: { expression: Expression; motion: Motion };
  choices: Choice[];
  stage?: StageSpec;
};

export type Scene = {
  id: string;
  number: number;
  title: string;
  relation: string;
  place: string;
  partnerName: string;
  base: Situation;
  followUp: Situation & { prompt: string; from: string; to: string };
  discovery: string;
};
