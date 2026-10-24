"use client";

import { useAvatar } from "@/features/avatar/avatar";
import { COLOR_HEX, ownedItem, useRewards } from "./rewards";

// 장면과 아지트에 나오는 주인공 모습과 방에 놓인 물건. 서버 기준으로 갖지 않은 아이템은 빼고 보여준다
export function useHeroLook() {
  const avatar = useAvatar();
  const rewards = useRewards();
  const worn = ownedItem(rewards, avatar.accessory);
  // 보상 상태를 아직 한 번도 못 받았으면 저장된 모습을 그대로 쓴다
  const accessory = rewards ? (worn ? avatar.accessory : null) : avatar.accessory;
  const placed = (rewards?.items ?? []).filter((i) => i.kind === "room" && i.owned && !avatar.hidden.includes(i.id)).map((i) => i.id);
  return {
    avatar,
    hero: avatar.hero,
    accessory: accessory ?? undefined,
    accessoryColor: worn?.owned?.color ? COLOR_HEX[worn.owned.color] : undefined,
    placed,
  };
}
