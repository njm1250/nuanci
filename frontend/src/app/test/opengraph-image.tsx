import { CARD_SIZE } from "@/features/share/card";
import { testCard } from "@/features/typetest/cards";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "영어 사고 유형 테스트 · 아홉 가지 Mochi 유형";

export default function Image() {
  return testCard();
}
