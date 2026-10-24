"use client";

import { useSyncExternalStore } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET = 9 * 60 * 60 * 1000;
const noop = () => () => {};

// 한국 시간으로 오늘이 1970년부터 며칠째인지. 서버에서 미리 그릴 때는 시각을 쓰지 않도록 null이고, 브라우저에서만 센다
export function useKstDay() {
  return useSyncExternalStore(noop, () => Math.floor((Date.now() + KST_OFFSET) / DAY_MS), () => null);
}

// 그날 한국 시간 정오의 시각. 요일 이름을 구할 때 쓴다
export function kstNoon(day: number) {
  return new Date(day * DAY_MS - KST_OFFSET + 12 * 60 * 60 * 1000);
}
