"use client";

import { useSyncExternalStore } from "react";

// 대사의 한국어 번역을 늘 보여줄지. 기본은 꺼 둔다. 번역이 처음부터 깔려 있으면 영어를 알아들으려 애쓸 이유가 없어진다.
// 모르겠을 때는 장면의 "뜻 보기"로 그때만 켜고, 늘 켜 두고 싶은 사람은 내 정보에서 켠다. 기기에 기억해 둔다
const KEY = "nuanci.translation";
const listeners = new Set<() => void>();

function snapshot() {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function useTranslationOn() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    snapshot,
    () => false,
  );
}

export function toggleTranslation() {
  try {
    localStorage.setItem(KEY, snapshot() ? "off" : "on");
  } catch {}
  listeners.forEach((l) => l());
}
