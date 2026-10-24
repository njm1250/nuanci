"use client";

import { useSyncExternalStore } from "react";
import { hasPlayed } from "./track";

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

const SINCE_KEY = "nuanci.since";
// 이 기능 전에 다녀간 방문자는 첫 공개 때 있던 장면(8번까지)을 본 것으로 친다
const LAUNCH_MAX_NUMBER = 8;
const sinceListeners = new Set<() => void>();

function sinceSnapshot() {
  try {
    const raw = localStorage.getItem(SINCE_KEY);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

export function useSince() {
  return useSyncExternalStore(
    (on) => {
      sinceListeners.add(on);
      return () => sinceListeners.delete(on);
    },
    sinceSnapshot,
    () => null,
  );
}

// 처음 온 날 있던 장면 중 가장 큰 번호를 남긴다. 이보다 번호가 큰 장면이 그 뒤에 추가된 새 장면이다
// 하이드레이션 중에는 훅 값이 아직 기본값이라, 다시 온 방문자인지는 저장된 기록을 직접 읽어 판단한다
export function rememberSince(scenes: { number: number }[]) {
  if (sinceSnapshot() !== null || scenes.length === 0) return;
  const returning = hasPlayed() || snapshot().length > 0;
  const max = returning ? LAUNCH_MAX_NUMBER : Math.max(...scenes.map((s) => s.number));
  try {
    localStorage.setItem(SINCE_KEY, String(max));
  } catch {}
  sinceListeners.forEach((l) => l());
}

// 처음 온 뒤에 추가됐고 아직 끝내지 않은 장면 id
export function newSceneIds(scenes: { id: string; number: number }[], cleared: string[], since: number | null) {
  if (since === null) return [];
  return scenes.filter((s) => s.number > since && !cleared.includes(s.id)).map((s) => s.id);
}
