"use client";

import { useState, useSyncExternalStore } from "react";

// 질문 앞 대사(빌드업)를 보고 싶은 사람과 바로 고르고 싶은 사람이 갈린다. 두 번 연달아 건너뛴 사람은 다음 장면부터 바로 질문에서 시작하고,
// 대사를 끝까지 보거나 "앞 대화 다시 보기"를 펼친 사람은 다시 대사부터 본다. 기기에 기억해 둔다
const KEY = "nuanci.lead";
const SKIPS_TO_SWITCH = 2;

type Pref = { skips: number; skip: boolean };

function read(): Pref {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Pref;
  } catch {}
  return { skips: 0, skip: false };
}

function write(pref: Pref) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pref));
  } catch {}
}

export function noteLeadSkipped() {
  const skips = read().skips + 1;
  write({ skips, skip: skips >= SKIPS_TO_SWITCH });
}

export function noteLeadWatched() {
  write({ skips: 0, skip: false });
}

const never = () => () => {};

// 이 장면을 대사 없이 질문부터 시작할지. 장면에 들어올 때 한 번만 정해서, 장면 도중에 기억이 바뀌어도 화면이 뒤집히지 않는다
export function useStartAtQuestion() {
  const ready = useSyncExternalStore(never, () => true, () => false);
  const [skip, setSkip] = useState<boolean | null>(null);
  if (ready && skip === null) setSkip(read().skip);
  return skip ?? false;
}
