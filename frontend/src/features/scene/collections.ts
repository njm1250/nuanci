import type { StageSpec } from "@/features/stage/types";

// 특집: 사람이 고른 장면 묶음. 장면의 category 값이 곧 특집 slug다.
// 시작일~종료일 동안 홈 둘째 자리·전체 장면 맨 위·장면 3개 결과에 걸리고, 끝나면 전체 장면의 "지난 특집"으로 내려간다. 장면 주소는 계속 열려 있다
export type FeatureSlug = "dev" | "xmas";
export type FeatureDecor = "off" | "static" | "snow";

// season: 기간 중에만 메인 경로에 오른다(홈 둘째 자리, 전체 장면 맨 위, 장면 3개 결과의 입구, 시즌 장식).
// pack: 대상이 따로 있는 상시 묶음이라 메인 경로에 올리지 않는다. 홈 아래쪽 배너와 전체 장면의 상황별 뒤에만 둔다
export type FeatureKind = "season" | "pack";

export type Feature = {
  slug: FeatureSlug;
  kind: FeatureKind;
  name: string;
  // 표지 무대. 없으면 특집 첫 장면의 무대를 쓴다
  cover?: Omit<StageSpec, "hero" | "wear">;
  // 한국 시각 기준. end가 없으면 계속 걸려 있다
  start: string;
  end?: string;
  // 기간이 겹치면 숫자가 작은 쪽이 앞에 온다
  priority: number;
  decor: FeatureDecor;
};

export const FEATURE_LIST: Feature[] = [
  { slug: "xmas", kind: "season", name: "크리스마스 특집", cover: { set: "living", time: "evening", partner: "raj", decor: [{ id: "xmas-tree", x: -2.2 }] }, start: "2026-11-22T00:00:00+09:00", end: "2027-01-01T00:00:00+09:00", priority: 1, decor: "snow" },
  { slug: "dev", kind: "pack", name: "첫 PR 머지까지", start: "2026-11-12T00:00:00+09:00", priority: 2, decor: "off" },
];

const SLUGS = new Set<string>(FEATURE_LIST.map((f) => f.slug));
export const isFeatureSlug = (v: string | null | undefined): v is FeatureSlug => !!v && SLUGS.has(v);

export type FeatureState = "live" | "past" | "upcoming";

// override는 개발용(?season=xmas): 날짜와 상관없이 그 특집을 기간 중으로 본다
export function featureState(f: Feature, now: number, override: string | null): FeatureState {
  if (override === f.slug) return "live";
  if (now < Date.parse(f.start)) return "upcoming";
  return f.end && now >= Date.parse(f.end) ? "past" : "live";
}

// 장면이 들어 있는 모음. 특집 slug, 또는 "영하 100도 대회 1/5"처럼 제목에 화수가 붙은 연속극("series:영하 100도 대회")
export function collectionOf(s: { title: string; category?: string }) {
  if (isFeatureSlug(s.category)) return s.category;
  const series = /^(.+?)\s*\d+\/\d+$/.exec(s.title);
  return series ? `series:${series[1]}` : undefined;
}

export type OrderItem = { id: string; number: number; collection?: string };

const inFeature = (s: { collection?: string }) => isFeatureSlug(s.collection);

// 다음 장면 규칙 하나. 홈·전체 장면·장면 끝이 모두 이걸 쓴다.
// 1) 방금 한 장면(after)이 특집이나 연속극에 속하고 그 안에 남은 장면이 있으면 그 모음의 다음 장면. 연속극은 이야기가 끊기지 않게 해 본 화도 건너뛰지 않는다
// 2) 아니면 추천 순서에서 안 해 본 첫 장면. 특집 장면은 섞지 않는다
// 3) 다 했으면 null(부르는 쪽이 "처음부터 다시"를 보여 준다)
export function upNext<T extends OrderItem>(order: T[], cleared: string[], after?: string): T | null {
  const current = after ? order.find((s) => s.id === after) : undefined;
  if (current?.collection) {
    const own = order.filter((s) => s.collection === current.collection);
    const rest = own.slice(own.indexOf(current) + 1);
    const hit = inFeature(current) ? [...rest, ...own].find((s) => s.id !== after && !cleared.includes(s.id)) : rest[0];
    if (hit) return hit;
  }
  return order.find((s) => !inFeature(s) && s.id !== after && !cleared.includes(s.id)) ?? null;
}

// 장면 화면이 서버에서 미리 받아 둘 다음 장면. 처음부터 차례대로 해 온 사람을 가정한다(같은 모음에서 앞에 있는 장면은 해 봤다고 친다).
// 실제 기록과 다르면 브라우저에서 다시 고른다
export function guessNext<T extends OrderItem>(order: T[], current: string) {
  const at = order.findIndex((s) => s.id === current);
  const me = order[at];
  if (!me) return null;
  const sameLane = (s: T) => (inFeature(me) ? s.collection === me.collection : !inFeature(s));
  return upNext(order, order.slice(0, at).filter(sameLane).map((s) => s.id), current);
}
