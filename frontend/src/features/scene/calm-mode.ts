"use client";

import { useSyncExternalStore } from "react";

// "차분한 화면": 무대 흔들림·컷인·자동 넘김 같은 움직임을 줄여 영어 문장에 집중하기 쉽게 만든다. 기기에 기억해 둔다
const KEY = "nuanci.calm";
const listeners = new Set<() => void>();

function snapshot() {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function useCalmMode() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      window.addEventListener("storage", on);
      return () => {
        listeners.delete(on);
        window.removeEventListener("storage", on);
      };
    },
    snapshot,
    () => false,
  );
}

export function toggleCalmMode() {
  try {
    localStorage.setItem(KEY, snapshot() ? "off" : "on");
  } catch {}
  listeners.forEach((l) => l());
}
