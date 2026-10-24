"use client";

import { useSyncExternalStore } from "react";
import { visitorId } from "@/features/scene/track";

// 연속 기록. 하루(한국 시간)에 장면을 하나라도 끝내면 이어진다. 서버가 세고, 화면이 바로 그려지도록 마지막 값을 이 기기에 남긴다
// week는 오늘을 포함한 최근 7일에 했는지(오래된 날부터)
export type StreakState = { current: number; best: number; today: boolean; week: boolean[]; badges: number[]; nextBadge: number | null };

// 장면을 끝내고 오늘 처음 이어졌을 때 완료 화면에서 보여줄 순간
export type StreakMoment = { sceneId: string; current: number; newBadge: number | null };

const KEY = "nuanci.streak";
const listeners = new Set<() => void>();
let state: StreakState | null = null;
let loaded = false;
let moment: StreakMoment | null = null;

function snapshot() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = JSON.parse(raw);
    } catch {}
  }
  return state;
}

function set(next: StreakState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

export function useStreak() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    snapshot,
    () => null,
  );
}

async function post(path: string) {
  const res = await fetch(`/api/streak${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId: visitorId() }),
  }).catch(() => null);
  return res?.ok ? res.json() : null;
}

// 페이지를 열 때 받아 온다. 로그인했으면 이 기기에서 쌓은 날을 계정으로 옮긴다
export async function syncStreak() {
  const body = await post("/sync");
  if (body) set(body);
}

// 장면을 끝낼 때마다 부른다. 다시 한 장면도 그날 한 것으로 친다
export async function playStreak(sceneId: string) {
  const body = (await post("/play")) as (StreakState & { extended: boolean; newBadge: number | null }) | null;
  if (!body) return;
  const { extended, newBadge, ...next } = body;
  if (extended) moment = { sceneId, current: next.current, newBadge };
  set(next);
}

export function useStreakMoment(sceneId: string) {
  useStreak();
  return moment?.sceneId === sceneId ? moment : null;
}
