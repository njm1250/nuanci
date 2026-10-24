"use client";

import { useSyncExternalStore } from "react";
import { THEME_COLORS, THEME_KEY as KEY } from "./theme-script";

// 화면 밝기. 기본은 종이색 밝은 화면이고, 밤 화면을 고르면 이 기기에 남긴다. 그리기 전에 layout의 인라인 스크립트가 html에 먼저 붙인다
export type Theme = "dark" | "light";

const listeners = new Set<() => void>();

function snapshot(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useTheme() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    snapshot,
    () => "light" as Theme,
  );
}

export function setTheme(theme: Theme) {
  try {
    if (theme === "dark") localStorage.setItem(KEY, "dark");
    else localStorage.removeItem(KEY);
  } catch {}
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  listeners.forEach((l) => l());
}
