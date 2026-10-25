import { CARD_SIZE } from "@/features/share/card";
import { typeCard } from "@/features/typetest/cards";
import { isTypeId, TYPE_IDS } from "@/features/typetest/types";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "영어 사고 유형 결과 카드";

export function generateStaticParams() {
  return TYPE_IDS.map((type) => ({ type }));
}

export default async function Image({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  return typeCard(isTypeId(type) ? type : "literal");
}

