"use client";

import { useSyncExternalStore } from "react";
import type { AccessoryId, Hero } from "@/features/stage/types";

// wear는 쓰고 있는 아이템(머리·얼굴·목에 하나씩), placed는 아지트에 둔 물건 id다. 얻어도 사용자가 쓰거나 두기 전에는 그대로 둔다.
// placed가 없고 hidden이 있으면 얻은 물건이 모두 놓이던 때의 기록이라, 얻은 물건 중 hidden에 없는 것을 둔 것으로 본다
// badge는 이름 옆에 다는 연속 기록 뱃지(며칠짜리), 0이면 달지 않는다
export type Avatar = { hero: Hero; wear: AccessoryId[]; placed?: string[]; hidden?: string[]; badge?: number };

const KEY = "nuanci.avatar";
const HERO_RESET_KEY = "nuanci.heroReset";
const DEFAULT: Avatar = { hero: "girl", wear: [], placed: [] };

// 아이템을 하나만 쓰던 때 저장한 accessory를 wear 목록으로 바꾼다
function normalize(raw: Partial<Avatar> & { accessory?: AccessoryId | null }): Avatar {
  const { accessory, ...rest } = raw;
  const legacy = rest.placed === undefined && rest.hidden !== undefined;
  return { ...DEFAULT, ...rest, placed: legacy ? undefined : (rest.placed ?? []), wear: rest.wear?.length ? rest.wear : accessory ? [accessory] : [] };
}
const listeners = new Set<() => void>();
let lastRaw: string | null = null;
let lastValue: Avatar = DEFAULT;

// 기본 주인공을 여자로 바꾸면서 이 기기에 저장된 선택도 한 번만 여자로 맞춘다. 그 뒤에 남자를 고르면 그대로 둔다
function resetHeroOnce() {
  if (localStorage.getItem(HERO_RESET_KEY)) return;
  localStorage.setItem(HERO_RESET_KEY, "1");
  const raw = localStorage.getItem(KEY);
  if (raw) localStorage.setItem(KEY, JSON.stringify({ ...JSON.parse(raw), hero: "girl" }));
}

function snapshot(): Avatar {
  let raw: string | null = null;
  try {
    resetHeroOnce();
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

export function setAvatar(value: Avatar, saveToAccount: boolean) {
  const { hidden, ...next } = value.placed === undefined ? value : { ...value, hidden: undefined };
  void hidden;
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
