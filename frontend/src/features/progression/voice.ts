"use client";

import { useSyncExternalStore } from "react";
import type { Trap } from "@/features/scene/types";

// "내 영어 말투": 질문마다 첫 답으로 고른 말이 어떤 함정에 걸렸는지 모아, 내 영어가 상대에게 어떻게 들리는 편인지 한 줄로 보여 준다.
// 장면·단계마다 첫 답 하나만 센다. 다시 해 본 장면은 새 답으로 덮는다. 로그인 없이 이 브라우저에만 저장한다
const KEY = "nuanci.voice";
type Store = Record<string, Trap | "good">;
const EMPTY: Store = {};
const listeners = new Set<() => void>();
let lastRaw: string | null = null;
let lastValue: Store = EMPTY;

function snapshot(): Store {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastValue = raw ? JSON.parse(raw) : EMPTY;
    } catch {
      lastValue = EMPTY;
    }
  }
  return lastValue;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function recordVoice(sceneId: string, step: "base" | "followUp", trap: Trap | undefined) {
  const next = { ...snapshot(), [`${sceneId}:${step}`]: trap ?? "good" };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

// 함정마다 "상대에게 이렇게 들리는 편"으로 바꿔 쓴 말. 함정 이름(직역 등)보다 들린 결과를 말한다
const LEANS: Record<Trap, string> = {
  literal: "한국어를 그대로 옮긴 말로 들리는 편",
  konglish: "콩글리시가 섞여 엉뚱하게 들리는 편",
  answer: "대답이 엇갈려 들리는 편",
  textbook: "교과서를 읽는 것처럼 딱딱하게 들리는 편",
  blunt: "의도보다 차갑고 세게 들리는 편",
  formal: "의도보다 거리감 있게 들리는 편",
  context: "분위기와 엇나가 들리는 편",
  misread: "다른 뜻으로 오해받는 편",
  culture: "문화 차이로 어색하게 들리는 편",
};

// 이만큼 답해야 성향을 말한다. 한두 번으로는 우연과 구분되지 않는다
export const VOICE_MIN = 4;

export type Voice = {
  answered: number;
  // 의도대로 들린 첫 답의 수와 비율(0~100)
  good: number;
  clear: number;
  // 가장 자주 걸린 함정과 그 함정이 만든 인상. 함정에 한 번도 안 걸렸으면 null
  top: { trap: Trap; count: number; lean: string } | null;
  headline: string;
};

export function voiceOf(store: Store): Voice {
  const answers = Object.values(store);
  const answered = answers.length;
  const good = answers.filter((a) => a === "good").length;
  const counts = new Map<Trap, number>();
  for (const a of answers) if (a !== "good") counts.set(a, (counts.get(a) ?? 0) + 1);
  const [trap, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  const top = trap ? { trap, count: count!, lean: LEANS[trap] } : null;
  const clear = answered ? Math.round((good / answered) * 100) : 0;
  const headline =
    answered < VOICE_MIN ? `질문 ${VOICE_MIN - answered}개 더 답하면 보여요` : top && clear < 70 ? `영어로는 ${top.lean}` : "대체로 의도대로 들리는 편";
  return { answered, good, clear, top, headline };
}

const voiceCache = { store: EMPTY as Store, voice: voiceOf(EMPTY) };
function voiceSnapshot() {
  const store = snapshot();
  if (store !== voiceCache.store) {
    voiceCache.store = store;
    voiceCache.voice = voiceOf(store);
  }
  return voiceCache.voice;
}
const emptyVoice = voiceOf(EMPTY);

export function useVoice() {
  return useSyncExternalStore(subscribe, voiceSnapshot, () => emptyVoice);
}
