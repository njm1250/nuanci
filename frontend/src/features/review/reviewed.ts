"use client";

import { useSyncExternalStore } from "react";

// 오늘 복습을 끝냈는지("done"), 오늘은 물을 말이 없었는지("none"). 홈의 오늘의 목표가 읽는다
const KEY = "nuanci.reviewedOn";
const listeners = new Set<() => void>();
const day = () => new Date().toLocaleDateString("sv");

export function markReviewed(state: "done" | "none") {
  const value = `${day()}:${state}`;
  try {
    if (localStorage.getItem(KEY) === value) return;
    localStorage.setItem(KEY, value);
  } catch {}
  listeners.forEach((l) => l());
}

export function useReviewedToday() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    () => {
      try {
        const [on, state] = (localStorage.getItem(KEY) ?? "").split(":");
        return on === day() ? (state as "done" | "none") : null;
      } catch {
        return null;
      }
    },
    () => null,
  );
}
