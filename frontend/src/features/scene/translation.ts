"use client";

import { useSyncExternalStore } from "react";

// 대사·엔딩의 한국어 번역을 보여줄지. 영어만 보고 싶은 사람을 위해 끌 수 있고, 기기에 기억해 둔다
const KEY = "nuanci.translation";
const listeners = new Set<() => void>();

function snapshot() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function useTranslationOn() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    snapshot,
    () => true,
  );
}

export function toggleTranslation() {
  try {
    localStorage.setItem(KEY, snapshot() ? "off" : "on");
  } catch {}
  listeners.forEach((l) => l());
}
