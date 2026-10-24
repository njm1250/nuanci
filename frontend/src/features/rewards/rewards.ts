// 보상 목록과 받는 조건. 보상은 끝낸 장면 목록만으로 계산해서, 로그인하면 기록과 함께 그대로 따라온다.
// 새 조건이 생기면 Rule에 종류를 더하고 earns에서 판단만 늘리면 된다
export type Rule =
  // 장면을 N개 끝내면
  | { type: "milestone"; count: number }
  // 특정 장면을 끝내면
  | { type: "scene"; sceneId: string };

// 보상은 내 방에 놓이는 물건이다. id는 방 무대의 flags로 그대로 쓴다
export type Reward = { id: string; name: string; rule: Rule };

export const REWARDS: Reward[] = [
  { id: "plant", name: "화분", rule: { type: "milestone", count: 3 } },
  { id: "poster", name: "포스터", rule: { type: "milestone", count: 6 } },
  { id: "rug", name: "러그", rule: { type: "milestone", count: 10 } },
  { id: "trophy", name: "트로피", rule: { type: "milestone", count: 15 } },
  { id: "fishbowl", name: "어항", rule: { type: "scene", sceneId: "elevator-stuck" } },
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

// 아직 못 받은 보상의 조건. 장면 보상은 안 해 본 장면의 제목이 드러나지 않게 돌려 말한다
export function ruleHint(rule: Rule) {
  switch (rule.type) {
    case "milestone":
      return `장면 ${rule.count}개 끝내기`;
    case "scene":
      return "어떤 장면을 끝내면 열려요";
  }
}
