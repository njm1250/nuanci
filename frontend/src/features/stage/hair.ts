import type { AccessoryId, Hero, Look } from "./types";

// 머리 아이템 하나에 여자·남자 모습이 함께 있다. 주인공을 바꿔도 얻은 머리가 짝이 되는 모습으로 그대로 이어진다
export const HAIR_ITEMS = {
  "hair-1": { girl: { style: "bob", name: "단발머리" }, boy: { style: "mash", name: "덮은 머리" } },
  "hair-2": { girl: { style: "twintail", name: "양갈래 머리" }, boy: { style: "part", name: "가르마 머리" } },
  "hair-3": { girl: { style: "ribbon", name: "리본 긴 머리" }, boy: { style: "perm", name: "뽀글 파마" } },
  "hair-4": { girl: { style: "spacebuns", name: "만두 머리" }, boy: { style: "spiky", name: "삐죽 머리" } },
  "hair-5": { girl: { style: "sidepony", name: "옆으로 묶은 머리" }, boy: { style: "wolf", name: "울프컷" } },
  "hair-6": { girl: { style: "wave", name: "웨이브 머리" }, boy: { style: "pomp", name: "올림 머리" } },
} as const satisfies Partial<Record<AccessoryId, Record<Hero, { style: Look["hairStyle"]; name: string }>>>;

export type HairItemId = keyof typeof HAIR_ITEMS;

export function isHairItem(id: string): id is HairItemId {
  return id in HAIR_ITEMS;
}
