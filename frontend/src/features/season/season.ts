"use client";

import { useSyncExternalStore } from "react";
import { FEATURE_LIST, featureState, type Feature, type FeatureState } from "@/features/scene/collections";

// 지금 기간 중인 특집. 홈·전체 장면은 미리 만들어 두는 페이지라 서버 시각이 아니라 이 브라우저의 시각으로 정한다(서버 그림에서는 특집 없음)
// 개발할 때는 ?season=xmas 로 날짜와 상관없이 켜고, ?season=off 로 푼다. 켠 값은 이 탭에만 남아 홈과 전체 장면을 오가도 유지된다
const OVERRIDE_KEY = "nuanci.season";
const DAY = 86_400_000;

function override() {
  try {
    const q = new URLSearchParams(location.search).get("season");
    if (q === "off") sessionStorage.removeItem(OVERRIDE_KEY);
    else if (q) sessionStorage.setItem(OVERRIDE_KEY, q);
    return sessionStorage.getItem(OVERRIDE_KEY);
  } catch {
    return null;
  }
}

export type Season = { states: Record<string, FeatureState>; today: number };
const SERVER: Season = { states: {}, today: 0 };
let last: Season = SERVER;
let lastKey = "";

// 하루 단위로만 바뀌는 값이라 스냅숏을 그 키로 묶어 둔다(useSyncExternalStore는 같은 값을 돌려받아야 한다)
function snapshot(): Season {
  const now = Date.now();
  const over = override();
  const states = Object.fromEntries(FEATURE_LIST.map((f) => [f.slug, featureState(f, now, over)]));
  const today = Math.floor(now / DAY);
  const key = `${today}|${JSON.stringify(states)}`;
  if (key !== lastKey) {
    lastKey = key;
    last = { states, today };
  }
  return last;
}

const noSubscribe = () => () => {};

export function useSeason() {
  return useSyncExternalStore(noSubscribe, snapshot, () => SERVER);
}

// 장면이 하나라도 공개된 특집만 고른다. 장면이 없는 특집은 어디에도 보이지 않는다
export function featuresIn(season: Season, state: FeatureState, has: (f: Feature) => boolean) {
  return FEATURE_LIST.filter((f) => season.states[f.slug] === state && has(f)).sort((a, b) => a.priority - b.priority);
}

// 공개 후 14일 안에 생긴 장면. 생성일이 없는 목차(예전 백엔드)면 아무것도 NEW가 아니다
export const NEW_DAYS = 14;
export function isFresh(createdAt: string | undefined, today: number) {
  if (!createdAt || today === 0) return false;
  return today - Math.floor(Date.parse(createdAt) / DAY) < NEW_DAYS;
}

// 메뉴의 "눈 효과" 스위치. 기본은 켬이고 끈 사람만 기기에 남긴다
const SNOW_KEY = "nuanci.snow";
const snowListeners = new Set<() => void>();

function snowSnapshot() {
  try {
    return localStorage.getItem(SNOW_KEY) !== "off";
  } catch {
    return true;
  }
}

export function useSnowOn() {
  return useSyncExternalStore(
    (on) => {
      snowListeners.add(on);
      return () => snowListeners.delete(on);
    },
    snowSnapshot,
    () => true,
  );
}

export function setSnowOn(on: boolean) {
  try {
    if (on) localStorage.removeItem(SNOW_KEY);
    else localStorage.setItem(SNOW_KEY, "off");
  } catch {}
  snowListeners.forEach((l) => l());
}
