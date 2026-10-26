"use client";

import { useSyncExternalStore } from "react";

// 장면은 노출 순서대로 1화, 2화…로 부르고 10화씩 묶는다. "144개 중 2개"처럼 끝이 안 보이는 진행도 대신 가까운 목표(다음 10화)를 보여 주려는 것이다.
// 어느 장면이든 10개를 할 때마다 다음 10화가 열린다. 잠금은 목록에서의 연출일 뿐이라 공유 링크·검색으로 들어오면 어느 장면이든 열린다.
// 주소에 쓰는 장면 번호(/scenes/17)는 고정이고, "몇 화"는 순서를 바꾸면 따라 바뀐다
export const BLOCK_SIZE = 10;

export type Block<T> = { start: number; end: number; scenes: T[]; done: number; open: boolean };

export function blocks<T extends { id: string }>(order: T[], cleared: string[]): Block<T>[] {
  const total = order.filter((s) => cleared.includes(s.id)).length;
  const opened = Math.floor(total / BLOCK_SIZE) + 1;
  return Array.from({ length: Math.ceil(order.length / BLOCK_SIZE) }, (_, i) => {
    const scenes = order.slice(i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE);
    return { start: i * BLOCK_SIZE + 1, end: i * BLOCK_SIZE + scenes.length, scenes, done: scenes.filter((s) => cleared.includes(s.id)).length, open: i < opened };
  });
}

// 열린 마지막 화와 다음 10화가 열리기까지 남은 장면 수. 모두 열렸으면 left는 0이다
export function blockProgress<T extends { id: string }>(order: T[], cleared: string[]) {
  const list = blocks(order, cleared);
  const total = order.filter((s) => cleared.includes(s.id)).length;
  const openEnd = list.filter((b) => b.open).at(-1)?.end ?? 0;
  const into = total % BLOCK_SIZE;
  return { list, openEnd, into, left: list.every((b) => b.open) ? 0 : BLOCK_SIZE - into };
}

export function blockTitle(b: { start: number; end: number }) {
  return `${b.start}~${b.end}화`;
}

// 마지막으로 알려 준 열린 범위(몇 화까지). 새 10화가 열린 순간을 한 번만 알려 주려고 기기에 기억해 둔다.
// 처음 온 사람은 첫 10화까지 본 것으로 친다
const SEEN_KEY = "nuanci.openSeen";
const seenListeners = new Set<() => void>();

function seenSnapshot() {
  try {
    return Number(localStorage.getItem(SEEN_KEY) ?? BLOCK_SIZE);
  } catch {
    return BLOCK_SIZE;
  }
}

export function useSeenOpenEnd() {
  return useSyncExternalStore(
    (on) => {
      seenListeners.add(on);
      return () => seenListeners.delete(on);
    },
    seenSnapshot,
    () => Infinity,
  );
}

export function markOpenSeen(end: number) {
  try {
    localStorage.setItem(SEEN_KEY, String(end));
  } catch {}
  seenListeners.forEach((l) => l());
}
