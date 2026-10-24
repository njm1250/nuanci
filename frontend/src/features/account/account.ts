"use client";

import { useSyncExternalStore } from "react";
import { currentCleared, mergeCleared, onCleared } from "@/features/scene/progress";
import { visitorId } from "@/features/scene/track";

export type Me = { name: string | null; email: string | null; picture: string | null; cleared: string[] };

export type AccountState = { status: "loading" | "guest" | "member"; me: Me | null; google: boolean };

let state: AccountState = { status: "loading", me: null, google: false };
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
    () => state,
  );
}

// 로그인 상태를 확인하고, 로그인했으면 이 기기 기록과 계정 기록을 양쪽으로 합친다. 페이지를 처음 열 때 한 번만 한다
export async function loadAccount() {
  if (started) return;
  started = true;
  const [providers, me] = await Promise.all([
    fetch("/api/auth/providers").then((r) => (r.ok ? r.json() : { google: false })).catch(() => ({ google: false })),
    fetch("/api/me").then((r) => (r.ok ? (r.json() as Promise<Me>) : null)).catch(() => null),
  ]);
  if (!me) return set({ status: "guest", me: null, google: providers.google });
  mergeCleared(me.cleared);
  const synced = await fetch("/api/me/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId: visitorId(), cleared: currentCleared() }),
  })
    .then((r) => (r.ok ? (r.json() as Promise<Me>) : me))
    .catch(() => me);
  set({ status: "member", me: synced, google: providers.google });
}

// 로그인한 상태에서 장면을 끝내면 계정에도 바로 남긴다
onCleared((sceneId) => {
  if (state.status !== "member") return;
  void fetch("/api/me/cleared", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sceneId }) }).catch(() => {});
});

export function loginUrl(next: string) {
  return `/api/auth/google?next=${encodeURIComponent(next)}`;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  set({ ...state, status: "guest", me: null });
}

export async function deleteAccount() {
  const res = await fetch("/api/me", { method: "DELETE" }).catch(() => null);
  if (res?.ok) set({ ...state, status: "guest", me: null });
  return Boolean(res?.ok);
}
