import type { AccessoryId } from "@/features/stage/types";

// 아지트 꾸미기 아이템과 얻는 조건. 지금은 해 본 장면 목록으로 계산하고, 나중에 백엔드가 지급과 보관을 맡는다.
// 새 조건이 생기면 Rule에 종류를 더하고 earns에서 판단만 늘리면 된다
export type Rule =
  // 장면을 N개 해 보면
  | { type: "milestone"; count: number }
  // 특정 장면을 해 보면
  | { type: "scene"; sceneId: string };

// wear는 주인공이 쓰는 아이템(장면에도 그대로 나온다), room은 아지트에 놓이는 물건이다. id는 무대의 accessory·flags로 그대로 쓴다
export type Reward = { id: string; name: string; kind: "wear"; accessory: AccessoryId; rule: Rule } | { id: string; name: string; kind: "room"; rule: Rule };

export const REWARDS: Reward[] = [
  { id: "cap", name: "빨간 모자", kind: "wear", accessory: "cap", rule: { type: "milestone", count: 2 } },
  { id: "plant", name: "화분", kind: "room", rule: { type: "milestone", count: 3 } },
  { id: "glasses", name: "동그란 안경", kind: "wear", accessory: "glasses", rule: { type: "milestone", count: 5 } },
  { id: "headphones", name: "헤드폰", kind: "wear", accessory: "headphones", rule: { type: "milestone", count: 8 } },
  { id: "poster", name: "포스터", kind: "room", rule: { type: "milestone", count: 10 } },
  { id: "crown", name: "왕관", kind: "wear", accessory: "crown", rule: { type: "milestone", count: 15 } },
  { id: "fishbowl", name: "어항", kind: "room", rule: { type: "scene", sceneId: "elevator-stuck" } },
];

function earns(rule: Rule, cleared: string[]) {
  switch (rule.type) {
    case "milestone":
      return cleared.length >= rule.count;
    case "scene":
      return cleared.includes(rule.sceneId);
  }
}

export function earnedRewards(cleared: string[]) {
  return REWARDS.filter((r) => earns(r.rule, cleared));
}

// 가장 가까운 다음 목표. 장면 몇 개만 더 하면 무엇을 얻는지 알려 주는 데 쓴다
export function nextReward(cleared: string[]) {
  const next = REWARDS.filter((r) => r.rule.type === "milestone" && !earns(r.rule, cleared)).sort(
    (a, b) => (a.rule as { count: number }).count - (b.rule as { count: number }).count,
  )[0];
  return next ? { reward: next, remaining: (next.rule as { count: number }).count - cleared.length } : null;
}

// 아직 못 얻은 아이템의 조건. 장면 보상은 안 해 본 장면의 제목이 드러나지 않게 돌려 말한다
export function ruleHint(rule: Rule, cleared: string[]) {
  switch (rule.type) {
    case "milestone":
      return `장면 ${rule.count - cleared.length}개 더`;
    case "scene":
      return "어떤 장면에서";
  }
}
