import { C } from "./palette";
import type { CastId, Look } from "./types";

export const CAST: Record<CastId, Look & { name: string }> = {
  me: { name: "나", shirt: C.navy, hair: C.ink, hairStyle: "short" },
  sam: { name: "Sam", shirt: C.mustard, hair: "#4a2e1f", hairStyle: "bun" },
  alex: { name: "Alex", shirt: C.teal, hair: "#2e2620", hairStyle: "short", glasses: true },
  barista: { name: "Barista", shirt: "#e9e5dc", hair: "#6b4a2f", hairStyle: "cap", apron: "#3b2a20" },
  jordan: { name: "Jordan", shirt: C.rust, hair: "#241a14", hairStyle: "curly" },
};
