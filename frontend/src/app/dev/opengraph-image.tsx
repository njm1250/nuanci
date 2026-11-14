import { CARD_SIZE, devCard } from "@/features/share/card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "nuanci 개발자 팩 · 내 첫 PR, 머지까지 가 볼까?";

export default function Image() {
  return devCard();
}
