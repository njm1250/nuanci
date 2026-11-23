import { CARD_SIZE, homeCard } from "@/features/share/card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "nuanci · 내 영어, 어떻게 들릴까?";

export default function Image() {
  return homeCard();
}
