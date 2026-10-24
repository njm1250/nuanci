import { CARD_SIZE, shareCard } from "@/features/share/card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "nuanci";

export default async function Image() {
  return shareCard({ kicker: "\"오늘은 내가 쏠게!\" 영어로 하면?", line: "직역하면 사고 나는 순간들", note: "가입 없이 1분 →" });
}
