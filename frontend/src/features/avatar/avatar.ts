"use client";

import { useSyncExternalStore } from "react";
import type { AccessoryId, Hero } from "@/features/stage/types";

// hidden은 얻었지만 아지트에서 치워 둔 물건 id다. 얻은 물건은 기본으로 놓여 있다
export type Avatar = { hero: Hero; accessory: AccessoryId | null; hidden: string[] };

const KEY = "nuanci.avatar";
const DEFAULT: Avatar = { hero: "boy", accessory: null, hidden: [] };
const listeners = new Set<() => void>();
let lastRaw: string | null = null;
let lastValue: Avatar = DEFAULT;

function snapshot(): Avatar {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastValue = raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
    } catch {
      lastValue = DEFAULT;
    }
  }
  return lastValue;
}

// 아지트에서 꾸민 주인공 모습. 이 기기에 두고, 로그인했으면 계정에도 저장한다
export function useAvatar() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    snapshot,
    () => DEFAULT,
  );
}

export function currentAvatar() {
  return snapshot();
}

export function setAvatar(next: Avatar, saveToAccount: boolean) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
  if (saveToAccount) {
    void fetch("/api/me/avatar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => {});
  }
}

// 계정에 저장된 모습을 이 기기에 받아 온다
export function adoptAvatar(saved: Avatar | null) {
  if (!saved) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...DEFAULT, ...saved }));
  } catch {}
  listeners.forEach((l) => l());
}
