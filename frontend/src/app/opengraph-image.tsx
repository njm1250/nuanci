import { CARD_SIZE, homeCard } from "@/features/share/card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "nuanci · 직역하면 사고 나는 순간들";

export default function Image() {
  return homeCard();
}
