"use client";

import { useSyncExternalStore } from "react";
import { currentCleared, mergeCleared } from "@/features/scene/progress";
import { visitorId } from "@/features/scene/track";
import { adoptAvatar, currentAvatar, setAvatar, type Avatar } from "@/features/avatar/avatar";
import { syncRewards } from "@/features/rewards/rewards";
import { syncStreak } from "@/features/streak/streak";

export type Me = { name: string | null; email: string | null; picture: string | null; cleared: string[]; avatar: Avatar | null };

export type AccountState = { status: "loading" | "guest" | "member"; me: Me | null; google: boolean };

const INITIAL: AccountState = { status: "loading", me: null, google: false };
let state: AccountState = INITIAL;
const listeners = new Set<() => void>();
let started = false;

function set(next: AccountState) {
  state = next;
  listeners.forEach((l) => l());
}

export function useAccount() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    () => state,
    // 서버에서 그린 HTML과 맞도록 하이드레이션 중에는 항상 처음 상태를 쓴다
    () => INITIAL,
  );
}

// 로그인 상태를 확인하고, 로그인했으면 이 기기 기록과 계정 기록을 양쪽으로 합친다. 페이지를 처음 열 때 한 번만 한다
export async function loadAccount() {
  if (started) return;
  started = true;
  const [providers, me] = await Promise.all([
    fetch("/api/auth/providers").then((r) => (r.ok ? r.json() : { google: false })).catch(() => ({ google: false })),
    fetch("/api/me").then((r) => (r.status === 200 ? (r.json() as Promise<Me>) : null)).catch(() => null),
  ]);
  if (!me) return set({ status: "guest", me: null, google: providers.google });
  mergeCleared(me.cleared);
  adoptAvatar(me.avatar);
  const synced = await fetch("/api/me/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId: visitorId(), cleared: currentCleared() }),
  })
    .then((r) => (r.ok ? (r.json() as Promise<Me>) : me))
    .catch(() => me);
  set({ status: "member", me: synced, google: providers.google });
}

// 처음 로그인한 계정에는 저장된 모습이 없어서, 이 기기에서 꾸민 모습을 계정에 올린다. 보상을 계정으로 옮긴 뒤에 불러야 쓰는 아이템 확인을 통과한다
export function saveAvatarIfNew() {
  if (state.status === "member" && !state.me?.avatar) setAvatar(currentAvatar(), true);
}

export function loginUrl(next: string) {
  return `/api/auth/google?next=${encodeURIComponent(next)}`;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  set({ ...state, status: "guest", me: null });
  await Promise.all([syncRewards(), syncStreak()]);
}

export async function deleteAccount() {
  const res = await fetch("/api/me", { method: "DELETE" }).catch(() => null);
  if (res?.ok) {
    set({ ...state, status: "guest", me: null });
    await Promise.all([syncRewards(), syncStreak()]);
  }
  return Boolean(res?.ok);
}
