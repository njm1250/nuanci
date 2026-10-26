"use client";

import { useSyncExternalStore } from "react";
import type { SetId } from "@/features/stage/types";

type SceneGroup = { label: string; words: string[]; sets: SetId[] };

// 전체 장면을 누구와, 어디서 말하는지로 묶는다. 같은 말도 상대와 자리에 따라 뉘앙스가 달라져서 이 기준으로 고르는 게 쉽다.
// 화면에는 이 순서대로 보인다
export const SCENE_GROUPS: SceneGroup[] = [
  { label: "친구랑", words: ["친구", "동기"], sets: [] },
  // '형'은 '계획형'처럼 다른 낱말에도 들어 있어서 넣지 않는다
  { label: "같이 사는 사이", words: ["룸메이트", "가족", "엄마", "아빠", "동생", "언니", "누나", "오빠"], sets: [] },
  { label: "회사에서", words: ["동료", "상사", "팀장", "부장", "사장", "회사", "인턴", "거래처"], sets: ["office"] },
  { label: "카페·식당에서", words: ["카페", "식당", "분식", "버거", "배달", "바리스타"], sets: ["cafe", "bunsik"] },
  { label: "가게에서", words: ["옷가게", "편의점", "수리점", "미용", "헬스장 직원", "트레이너", "점원"], sets: ["store", "boutique", "salon", "gym"] },
  { label: "여행·이동 중", words: ["호텔", "승무원", "승객", "관광객", "분실물"], sets: ["plane", "subway"] },
  { label: "병원·약국에서", words: ["의사", "약사", "간호사", "병원"], sets: ["clinic", "pharmacy"] },
  { label: "학교·학원에서", words: ["선생님", "같은 반", "옆자리 친구", "교환학생", "언어 교환"], sets: ["classroom"] },
  { label: "처음 보는 사람", words: ["처음", "이웃", "상대", "회원", "자주 보는"], sets: [] },
];
export const OTHER_GROUP = "그 밖에";

// 관계 글에 여러 묶음의 낱말이 겹칠 때 좁은 묶음이 먼저다. '같은 반 친구'는 친구보다 학교, '분식집 사장님'은 회사보다 식당, '처음 보는 승객'은 처음 보는 사람보다 여행이다
const MATCH_ORDER = ["학교·학원에서", "여행·이동 중", "병원·약국에서", "카페·식당에서", "가게에서", "회사에서", "같이 사는 사이", "처음 보는 사람", "친구랑"].map(
  (label) => SCENE_GROUPS.find((g) => g.label === label)!,
);

// 관계 글의 낱말로 먼저 찾고, 맞는 게 없으면 무대 세트로 정한다
export function groupOf(relation: string, set?: SetId) {
  return (
    MATCH_ORDER.find((g) => g.words.some((w) => relation.includes(w)))?.label ??
    (set && MATCH_ORDER.find((g) => g.sets.includes(set))?.label) ??
    OTHER_GROUP
  );
}

// 전체 장면을 상황별로 볼지, 장면이 나오는 순서대로 볼지. 마지막에 고른 쪽을 기기에 기억해 둔다
export type SceneView = "group" | "order";
const KEY = "nuanci.sceneView";
const listeners = new Set<() => void>();

function snapshot(): SceneView {
  try {
    return localStorage.getItem(KEY) === "order" ? "order" : "group";
  } catch {
    return "group";
  }
}

export function useSceneView() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    snapshot,
    () => "group" as const,
  );
}

export function setSceneView(view: SceneView) {
  try {
    localStorage.setItem(KEY, view);
  } catch {}
  listeners.forEach((l) => l());
}
