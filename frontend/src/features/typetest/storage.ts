"use client";

import { useSyncExternalStore } from "react";
import { isTypeId, type TypeId } from "./types";

// 이 기기에 남기는 테스트 기록. 내 결과, 도감(내가 받았거나 친구 링크로 본 유형), 친구 링크로 들어왔을 때의 친구 결과

export type Mine = { type: TypeId; picks: string; version: string; avg: number };
export type Friend = { type: TypeId; picks: string | null; version: string | null };

function store<T>(area: "local" | "session", key: string, parse: (value: unknown) => T | null) {
  const listeners = new Set<() => void>();
  let lastRaw: string | null | undefined;
  let lastValue: T | null = null;
  const storage = () => (area === "local" ? localStorage : sessionStorage);

  function snapshot() {
    let raw: string | null = null;
    try {
      raw = storage().getItem(key);
    } catch {}
    if (raw !== lastRaw) {
      lastRaw = raw;
      try {
        lastValue = raw ? parse(JSON.parse(raw)) : null;
      } catch {
        lastValue = null;
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

  function save(value: T) {
    try {
      storage().setItem(key, JSON.stringify(value));
    } catch {}
    listeners.forEach((l) => l());
  }

  return { read: snapshot, save, use: () => useSyncExternalStore(subscribe, snapshot, () => null) };
}

const withType = <T extends { type: string }>(value: unknown) => (value && typeof value === "object" && isTypeId((value as T).type) ? (value as T) : null);

const mine = store<Mine>("local", "nuanci.test.mine", withType<Mine>);
const seen = store<TypeId[]>("local", "nuanci.test.seen", (v) => (Array.isArray(v) ? v.filter(isTypeId) : null));
// 친구 결과 링크에서 테스트를 시작하면, 끝난 뒤 친구와 나란히 비교할 수 있게 이 탭에만 남긴다
const friend = store<Friend>("session", "nuanci.test.friend", withType<Friend>);

export const useMine = mine.use;
export const useSeen = seen.use;
export const useFriend = friend.use;
export const readFriend = friend.read;
export const saveFriend = friend.save;

export function saveMine(value: Mine) {
  mine.save(value);
  markSeen(value.type);
}

export function markSeen(type: TypeId) {
  const list = seen.read() ?? [];
  if (!list.includes(type)) seen.save([...list, type]);
}
