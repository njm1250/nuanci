"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { StageSpec } from "./types";

// 장면 목록 카드에 쓰는 무대 썸네일. 화면 밖 무대 하나(thumb-studio)가 차례로 그려 그림으로 남기고, 이 기기에 저장해 두어 다음에 와도 다시 그리지 않는다.
// 다 그려 둔 뒤에는 three.js를 받지 않아도 되게, 그리는 쪽과 파일을 나눈다. 무대 그림이 바뀌면 VERSION을 올려 예전 그림을 버린다
const VERSION = 8;
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
    localStorage.removeItem(`nuanci.thumbs.v${VERSION - 1}`);
    const raw = localStorage.getItem(KEY);
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
  return JSON.stringify([spec.set, spec.time, spec.partner, spec.hero ?? "girl", spec.wear ?? [], spec.flags ?? [], spec.decor ?? []]);
}

// 이 무대의 썸네일 주소. 아직 없고 wanted(카드가 화면 가까이 왔을 때)면 그릴 차례에 올리고 null을 돌려준다
export function useThumb(spec: StageSpec | null, wanted = true) {
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
    if (!wanted || !spec || !key || urls.has(key) || queue.some((j) => j.key === key)) return;
    queue.push({ key, spec });
    emit();
  }, [key, wanted]); // eslint-disable-line react-hooks/exhaustive-deps
  return url;
}

// 그릴 썸네일이 남아 있는지. 다 그려 두었으면 그리는 쪽(three.js)을 아예 받지 않는다
export function useThumbJobs() {
  return useSyncExternalStore(subscribe, () => queue.length > 0, () => false);
}

// 지금 그릴 차례인 무대
export function useNextThumb() {
  return useSyncExternalStore(subscribe, () => queue[0] ?? null, () => null);
}

// 주인공 모습을 바꿀 때마다 새 그림이 쌓이므로, 오래된 것부터 지워 저장 공간을 이만큼 안에서 쓴다
const MAX_SAVED = 150;

export function finishThumb(key: string, url: string) {
  urls.set(key, url);
  for (const old of urls.keys()) {
    if (urls.size <= MAX_SAVED) break;
    urls.delete(old);
  }
  const i = queue.findIndex((j) => j.key === key);
  if (i >= 0) queue.splice(i, 1);
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(urls)));
  } catch {}
  emit();
}
