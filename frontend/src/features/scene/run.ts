"use client";

import { useSyncExternalStore } from "react";
import { quotedIntent } from "@/features/collection/pairs";
import { voiceOf, VOICE_MIN } from "@/features/progression/voice";
import type { Choice, Trap, Verdict } from "./types";
import { heardAs, heardSaid } from "./verdict";

// "한 판": 장면 셋을 한 묶음으로 세고, 셋을 끝내면 그 판에서 내 말이 어떻게 들렸는지 한 장으로 보여 준다.
// 끝이 안 보이는 장면 목록 대신 가까운 끝과 내 결과를 걸어 둔다. 판은 이 브라우저에 남아서 중간에 나갔다 와도 이어진다
export const RUN_SIZE = 3;

const KEY = "nuanci.run";

// 질문 하나에서 처음 고른 말. 결과 장에 그대로 옮겨 적으려고 문구까지 담아 둔다
export type RunPick = { sceneId: string; step: "base" | "followUp"; intent: string; line: string; heard: string; verdict: Verdict; trap?: Trap };
export type Run = { n: number; scenes: string[]; picks: RunPick[] };

const EMPTY: Run = { n: 1, scenes: [], picks: [] };
const listeners = new Set<() => void>();
let lastRaw: string | null = null;
let lastValue: Run = EMPTY;

function snapshot(): Run {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastValue = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
    } catch {
      lastValue = EMPTY;
    }
  }
  return lastValue;
}

function save(run: Run) {
  try {
    localStorage.setItem(KEY, JSON.stringify(run));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useRun() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

// 판이 끝난 뒤 새 장면에서 처음 고르는 순간 다음 판이 시작된다. 같은 질문을 다시 풀면 새 답으로 덮는다
export function recordRunPick(sceneId: string, step: "base" | "followUp", intent: string, choice: Choice) {
  const now = snapshot();
  const run = now.scenes.length >= RUN_SIZE && !now.scenes.includes(sceneId) ? { n: now.n + 1, scenes: [], picks: [] } : now;
  const pick: RunPick = { sceneId, step, intent, line: choice.line, heard: heardAs(choice), verdict: choice.verdict, trap: choice.trap };
  save({ ...run, picks: [...run.picks.filter((p) => !(p.sceneId === sceneId && p.step === step)), pick] });
}

export function completeRunScene(sceneId: string) {
  const run = snapshot();
  if (run.scenes.includes(sceneId) || run.scenes.length >= RUN_SIZE) return;
  save({ ...run, scenes: [...run.scenes, sceneId] });
}

// 이 장면이 판의 몇 번째인지. 끝난 판 뒤에 연 새 장면은 다음 판의 첫 번째다
export function runPosition(run: Run, sceneId: string) {
  const at = run.scenes.indexOf(sceneId);
  if (at >= 0) return at + 1;
  return run.scenes.length >= RUN_SIZE ? 1 : run.scenes.length + 1;
}

// 이 장면을 끝내면서 판이 끝났는지
export function runDoneAt(run: Run, sceneId: string) {
  return run.scenes.length >= RUN_SIZE && run.scenes.includes(sceneId);
}

// 결과 장에 쓸 요약. 끝낸 장면의 답만 세고, 통하지 않은 말을 "이번 판에 낸 사고"로 모은다
export function runSummary(run: Run) {
  const picks = run.picks.filter((p) => run.scenes.includes(p.sceneId));
  const mishaps = picks.filter((p) => p.verdict !== "good");
  const voice = voiceOf(Object.fromEntries(picks.map((p) => [`${p.sceneId}:${p.step}`, p.trap ?? "good"])));
  const headline = voice.answered >= VOICE_MIN ? voice.headline : mishaps.length ? "아직은 엇갈려 들리는 편" : "대체로 의도대로 들리는 편";
  return { picks, mishaps, good: picks.length - mishaps.length, headline };
}

// 결과를 친구에게 보내는 한마디. 문제 내기와 같은 말투로, 내가 낸 사고 하나를 그대로 적는다
export function runShareMessage(run: Run) {
  const { picks, mishaps } = runSummary(run);
  if (mishaps.length === 0) return `나 방금 영어로 ${picks.length}번 말했는데 다 의도대로 들렸어.\n너도 해 볼래?`;
  const quoted = mishaps.find((p) => p.intent.lastIndexOf(" 하고 ") > 0);
  const example = quoted ? `\n${quotedIntent(quoted.intent)} 했다가 ${heardSaid(quoted.heard)}.` : "";
  return `나 방금 영어로 ${picks.length}번 말했는데 ${mishaps.length}번은 다르게 들렸대.${example}\n너도 해 볼래?`;
}
