"use client";

import { useAvatar, type Avatar } from "@/features/avatar/avatar";
import type { AccessoryId, Worn } from "@/features/stage/types";
import { COLOR_HEX, isUsable, ownedItem, useRewards, type RewardItem } from "./rewards";

// 장면과 아지트에 나오는 주인공 모습과 방에 놓인 물건. 서버 기준으로 갖지 않은 아이템과 열지 않은 상자는 빼고 보여준다
export function useHeroLook() {
  const avatar = useAvatar();
  const rewards = useRewards();
  // 보상 상태를 아직 한 번도 못 받았으면 저장된 모습을 그대로 쓴다
  const wear: Worn[] = rewards
    ? avatar.wear.flatMap((id) => {
        const item = ownedItem(rewards, id);
        return item ? [{ id, color: item.owned?.color ? COLOR_HEX[item.owned.color] : undefined }] : [];
      })
    : avatar.wear.map((id) => ({ id }));
  const placed = (rewards?.items ?? []).filter((i) => i.kind === "room" && isUsable(i) && !avatar.hidden.includes(i.id)).map((i) => i.id);
  return { avatar, hero: avatar.hero, wear, placed, isWorn: (id: string) => wear.some((w) => w.id === id) };
}

// 아이템을 쓴다. 같은 자리(머리·얼굴·목)에 쓰던 것은 벗는다
export function putOn(avatar: Avatar, item: RewardItem, items: RewardItem[]): Avatar {
  const sameSlot = new Set(items.filter((i) => i.slot === item.slot).map((i) => i.id));
  return { ...avatar, wear: [...avatar.wear.filter((id) => !sameSlot.has(id)), item.id as AccessoryId] };
}

export function takeOff(avatar: Avatar, item: RewardItem): Avatar {
  return { ...avatar, wear: avatar.wear.filter((id) => id !== item.id) };
}
