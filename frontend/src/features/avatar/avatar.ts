"use client";

import { useSyncExternalStore } from "react";
import type { AccessoryId, Hero } from "@/features/stage/types";

// wear는 쓰고 있는 아이템(머리·얼굴·목에 하나씩), hidden은 얻었지만 아지트에서 치워 둔 물건 id다. 얻은 물건은 기본으로 놓여 있다
export type Avatar = { hero: Hero; wear: AccessoryId[]; hidden: string[] };

const KEY = "nuanci.avatar";
const DEFAULT: Avatar = { hero: "boy", wear: [], hidden: [] };

// 아이템을 하나만 쓰던 때 저장한 accessory를 wear 목록으로 바꾼다
function normalize(raw: Partial<Avatar> & { accessory?: AccessoryId | null }): Avatar {
  const { accessory, ...rest } = raw;
  return { ...DEFAULT, ...rest, wear: rest.wear?.length ? rest.wear : accessory ? [accessory] : [] };
}
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
      lastValue = raw ? normalize(JSON.parse(raw)) : DEFAULT;
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
export function adoptAvatar(saved: (Partial<Avatar> & { accessory?: AccessoryId | null }) | null) {
  if (!saved) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(normalize(saved)));
  } catch {}
  listeners.forEach((l) => l());
}
