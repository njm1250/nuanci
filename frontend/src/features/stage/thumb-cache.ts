"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { StageSpec } from "./types";

// 장면 목록 카드에 쓰는 무대 썸네일. 화면 밖 무대 하나(thumb-studio)가 차례로 그려 그림으로 남기고, 같은 세션에서는 다시 그리지 않는다.
// three.js 없이 읽을 수 있게 그리는 쪽과 파일을 나눈다. 무대 그림이 바뀌면 VERSION을 올려 예전 그림을 버린다
const VERSION = 1;
const KEY = `nuanci.thumbs.v${VERSION}`;

type Job = { key: string; spec: StageSpec };

const urls = new Map<string, string>();
const queue: Job[] = [];
const listeners = new Set<() => void>();
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) Object.entries(JSON.parse(raw) as Record<string, string>).forEach(([k, v]) => urls.set(k, v));
  } catch {}
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(on: () => void) {
  listeners.add(on);
  return () => listeners.delete(on);
}

export function thumbKey(spec: StageSpec) {
  return JSON.stringify([spec.set, spec.time, spec.partner, spec.hero ?? "boy", spec.wear ?? [], spec.flags ?? [], spec.decor ?? []]);
}

// 이 무대의 썸네일 주소. 아직 없으면 그릴 차례에 올리고 null을 돌려준다
export function useThumb(spec: StageSpec | null) {
  const key = spec ? thumbKey(spec) : null;
  const url = useSyncExternalStore(
    subscribe,
    () => {
      load();
      return key ? (urls.get(key) ?? null) : null;
    },
    () => null,
  );
  useEffect(() => {
    if (!spec || !key || urls.has(key) || queue.some((j) => j.key === key)) return;
    queue.push({ key, spec });
    emit();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return url;
}

// 지금 그릴 차례인 무대
export function useNextThumb() {
  return useSyncExternalStore(subscribe, () => queue[0] ?? null, () => null);
}

export function finishThumb(key: string, url: string) {
  urls.set(key, url);
  const i = queue.findIndex((j) => j.key === key);
  if (i >= 0) queue.splice(i, 1);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(Object.fromEntries(urls)));
  } catch {}
  emit();
}
