import { C } from "./palette";
import type { CastId, Hero, Look } from "./types";

export const CAST: Record<CastId, Look & { name: string }> = {
  me: { name: "나", hero: "boy", shirt: C.navy, hair: "#3a2a22", hairStyle: "fluffy" },
  meGirl: { name: "나", hero: "girl", shirt: "#f4a6bd", hair: "#5b3a29", hairStyle: "long" },
  sam: { name: "Sam", shirt: C.mustard, hair: "#4a2e1f", hairStyle: "bun" },
  alex: { name: "Alex", shirt: C.teal, hair: "#2e2620", hairStyle: "short", glasses: true },
  barista: { name: "Barista", shirt: "#e9e5dc", hair: "#6b4a2f", hairStyle: "cap", apron: "#3b2a20" },
  jordan: { name: "Jordan", shirt: C.rust, hair: "#241a14", hairStyle: "curly" },
  mochi: { name: "Mochi", shirt: "#f08aa8", hair: "#f0a24a", hairStyle: "none", animal: { kind: "cat", fur: "#f0a24a", inner: "#ffd9b8" } },
  boss: { name: "Boss", shirt: "#eef0f2", hair: "#9a9a98", hairStyle: "short", glasses: true, tie: C.rust },
  kong: { name: "Kong", shirt: "#ffc24b", hair: "#e8d3b0", hairStyle: "none", animal: { kind: "dog", fur: "#e8d3b0", inner: "#a8743f" } },
  max: { name: "Max", shirt: "#2f3440", hair: "#d9b04a", hairStyle: "short", muscle: true },
  mc: { name: "MC", shirt: "#3a2f6b", hair: "#1f1a18", hairStyle: "short", tie: "#e8b931" },
  snoozy: { name: "Snoozy", shirt: "#8fa3d6", hair: "#2f3a6b", hairStyle: "cap", tie: "#f2d34a" },
  // 동네 할아버지·골동품 가게 사장님처럼 나이 든 단역
  grandpa: { name: "Grandpa", shirt: "#8a6a4f", hair: "#dcdad4", hairStyle: "short", glasses: true },
  mom: { name: "Mom", shirt: "#b07fb5", hair: "#6b5a4f", hairStyle: "bun", apron: "#f2c6c6" },
  bori: { name: "Bori", shirt: "#5fb7a0", hair: "#7a4a2a", hairStyle: "none", animal: { kind: "bear", fur: "#7a4a2a", inner: "#f0d2ad" } },
};

export const HEROES: Record<Hero, CastId> = { boy: "me", girl: "meGirl" };
