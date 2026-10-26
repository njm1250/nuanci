export type RankRule = { min: number; name: string };
export type ProgressionRules = {
  ranks: RankRule[];
  milestones: Record<string, number>;
  boxes: number[];
};
export type ProgressionSettings = {
  version: number;
  updatedAt: string | null;
  rules: ProgressionRules;
};
export type ProgressionAdmin = {
  settings: ProgressionSettings;
  defaults: ProgressionRules;
  milestoneItems: { id: string; name: string }[];
  boxPoolSize: number;
};

export function rankAt(ranks: RankRule[], count: number) {
  const index = ranks.findLastIndex((rank) => count >= rank.min);
  return {
    current: ranks[Math.max(0, index)],
    next: ranks[Math.max(0, index) + 1],
  };
}
