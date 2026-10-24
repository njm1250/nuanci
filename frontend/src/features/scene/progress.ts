"use client";

import { useSyncExternalStore } from "react";

const KEY = "nuanci.cleared";
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let lastRaw: string | null = null;
let lastValue: string[] = EMPTY;

function snapshot() {
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

// 끝까지 본 장면 id 목록. 로그인 없이 이 브라우저에만 저장한다
export function useCleared() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function markCleared(id: string) {
  const cleared = snapshot();
  if (cleared.includes(id)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...cleared, id]));
  } catch {}
  listeners.forEach((l) => l());
}

// 추천 순서에서 아직 안 해 본 첫 장면. 다 해 봤으면 null
export function nextUncleared<T extends { id: string }>(order: T[], cleared: string[], after?: string) {
  const start = after ? order.findIndex((s) => s.id === after) + 1 : 0;
  const rest = [...order.slice(start), ...order.slice(0, start)];
  return rest.find((s) => s.id !== after && !cleared.includes(s.id)) ?? null;
}

// 장면을 끝낸 뒤 갈 곳. 안 해 본 장면이 있으면 그쪽으로, 모두 해 봤다면(다시 하기 중) 순서대로 다음 장면으로 간다.
// 마지막 장면까지 다시 해 봤으면 null
export function nextScene<T extends { id: string }>(order: T[], cleared: string[], current: string) {
  const uncleared = nextUncleared(order, cleared, current);
  if (uncleared) return uncleared;
  const i = order.findIndex((s) => s.id === current);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}
