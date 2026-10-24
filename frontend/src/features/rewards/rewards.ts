"use client";

import { useSyncExternalStore } from "react";
import { currentCleared, onCleared } from "@/features/scene/progress";
import { VIA_KEY, visitorId } from "@/features/scene/track";

// 보상 목록과 얻은 기록은 서버가 정한다. 로그인했으면 계정, 아니면 이 기기의 방문자 id가 주인이다.
// 화면이 바로 그려지도록 마지막으로 받은 상태를 이 기기에 남겨 둔다
export type RewardColor = "red" | "blue" | "yellow";

export type Owned = { color: RewardColor | null; reason: "milestone" | "scene" | "box" | "share"; sceneId: string | null; count: number | null; seen: boolean; grantedAt: string };

export type Lock = { type: "milestone"; remaining: number } | { type: "scene" | "share" | "box" };

// wear는 주인공이 쓰는 아이템(장면에도 그대로 나온다), room은 아지트에 놓이는 물건이다. id는 무대의 accessory·flags로 그대로 쓴다.
// 아직 못 얻은 아이템은 이름이 비어 있다
export type RewardItem = { id: string; kind: "wear" | "room"; name: string | null; colors: RewardColor[]; owned: Owned | null; lock: Lock | null };

export type NextGoal = { type: "item"; name: string; remaining: number } | { type: "box"; name: null; remaining: number };

export type RewardState = { items: RewardItem[]; next: NextGoal | null; shareCode: string | null };

export const COLOR_LABELS: Record<RewardColor, string> = { red: "빨강", blue: "파랑", yellow: "노랑" };
export const COLOR_HEX: Record<RewardColor, string> = { red: "#b4452f", blue: "#3f73c9", yellow: "#e8b931" };

const KEY = "nuanci.rewards";
const listeners = new Set<() => void>();
let state: RewardState | null = null;
let loaded = false;
// 장면을 끝내고 새로 얻은 보상. 완료 화면이 꺼내 보여준다
let pending: { sceneId: string; ids: string[] } | null = null;

function snapshot() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = JSON.parse(raw);
    } catch {}
  }
  return state;
}

function set(next: RewardState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(on: () => void) {
  listeners.add(on);
  return () => listeners.delete(on);
}

export function useRewards() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

async function post(path: string, body: object, method = "POST") {
  const res = await fetch(`/api/rewards${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, visitorId: visitorId() }),
  }).catch(() => null);
  return res?.ok ? res : null;
}

// 서버 상태를 받아 온다. 이 기기에서 끝낸 장면을 함께 보내서, 예전 기록으로 받을 수 있던 보상도 채운다
export async function syncRewards() {
  const res = await post("/sync", { cleared: currentCleared() });
  if (res) set(await res.json());
}

function takeVia() {
  try {
    const code = sessionStorage.getItem(VIA_KEY);
    sessionStorage.removeItem(VIA_KEY);
    return code;
  } catch {
    return null;
  }
}

// 장면을 처음 끝내면 서버가 조건을 보고 보상을 준다. 새로 얻은 것은 완료 화면에서 꺼내 보여준다
onCleared(async (sceneId) => {
  const res = await post("/clear", { sceneId, via: takeVia() });
  if (!res) return;
  const body = (await res.json()) as RewardState & { granted: string[] };
  const { granted, ...next } = body;
  if (granted.length > 0) pending = { sceneId, ids: granted };
  set(next);
});

export function usePendingRewards(sceneId: string) {
  const current = useRewards();
  if (!current || pending?.sceneId !== sceneId) return [];
  return pending.ids.map((id) => current.items.find((i) => i.id === id)).filter((i): i is RewardItem => Boolean(i?.owned));
}

export function setRewardColor(id: string, color: RewardColor) {
  if (!state) return;
  set({ ...state, items: state.items.map((i) => (i.id === id && i.owned ? { ...i, owned: { ...i.owned, color } } : i)) });
  void post(`/${id}/color`, { color }, "PUT");
}

// 아직 안 본 물건을 모두 본 것으로 남긴다. 아지트를 떠날 때 부른다
export function markAllRewardsSeen() {
  markRewardsSeen((state?.items ?? []).filter((i) => i.owned && !i.owned.seen).map((i) => i.id));
}

export function markRewardsSeen(ids: string[]) {
  if (ids.length === 0 || !state) return;
  set({ ...state, items: state.items.map((i) => (ids.includes(i.id) && i.owned ? { ...i, owned: { ...i.owned, seen: true } } : i)) });
  void post("/seen", { ids });
}

export function ownedItem(rewards: RewardState | null, id: string | null | undefined) {
  return id ? (rewards?.items.find((i) => i.id === id && i.owned) ?? null) : null;
}

// 다음 목표 문구를 [앞, 강조, 뒤]로 나눈다. 남은 양을 따로 떼어 강조할수록 목표가 가깝게 느껴진다
export function nextGoalParts(next: NextGoal): [string, string, string] {
  const prize = next.type === "box" ? "깜짝 상자" : next.name;
  return next.remaining === 1 ? ["", "한 장면", `만 더 하면 ${prize}`] : ["장면 ", `${next.remaining}개`, ` 더 하면 ${prize}`];
}

// 아직 못 얻은 아이템의 조건. 장면 기념품은 어느 장면인지 감춘다
export function lockHint(lock: Lock) {
  switch (lock.type) {
    case "milestone":
      return `장면 ${lock.remaining}개 더`;
    case "scene":
      return "어떤 장면에서";
    case "share":
      return "친구와 함께";
    case "box":
      return "깜짝 상자";
  }
}

// 얻은 까닭. 수집 기록과 완료 화면에 쓴다
export function ownedReason(owned: Owned, sceneTitle?: string) {
  switch (owned.reason) {
    case "milestone":
      return owned.count === 1 ? "첫 장면 기념" : `장면 ${owned.count}개 기념`;
    case "scene":
      return sceneTitle ? `「${sceneTitle}」 기념품` : "장면 기념품";
    case "box":
      return "깜짝 상자에서";
    case "share":
      return "친구와 같이 한 기념";
  }
}
