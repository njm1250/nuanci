import { C } from "./palette";
import type { CastId, Hero, Look } from "./types";

export const CAST: Record<CastId, Look & { name: string }> = {
  me: { name: "나", shirt: C.navy, hair: C.ink, hairStyle: "short" },
  meGirl: { name: "나", shirt: "#7b5ea7", hair: "#2b1d16", hairStyle: "long" },
  sam: { name: "Sam", shirt: C.mustard, hair: "#4a2e1f", hairStyle: "bun" },
  alex: { name: "Alex", shirt: C.teal, hair: "#2e2620", hairStyle: "short", glasses: true },
  barista: { name: "Barista", shirt: "#e9e5dc", hair: "#6b4a2f", hairStyle: "cap", apron: "#3b2a20" },
  jordan: { name: "Jordan", shirt: C.rust, hair: "#241a14", hairStyle: "curly" },
  mochi: { name: "Mochi", shirt: "#f08aa8", hair: "#f0a24a", hairStyle: "none", animal: { kind: "cat", fur: "#f0a24a", inner: "#ffd9b8" } },
  boss: { name: "Boss", shirt: "#eef0f2", hair: "#9a9a98", hairStyle: "short", glasses: true, tie: C.rust },
  kong: { name: "Kong", shirt: "#ffc24b", hair: "#e8d3b0", hairStyle: "none", animal: { kind: "dog", fur: "#e8d3b0", inner: "#a8743f" } },
  bori: { name: "Bori", shirt: "#5fb7a0", hair: "#7a4a2a", hairStyle: "none", animal: { kind: "bear", fur: "#7a4a2a", inner: "#f0d2ad" } },
};

export const HEROES: Record<Hero, CastId> = { boy: "me", girl: "meGirl" };
