import { getSceneByNumber, getScenes } from "@/features/scene/api";
import { CARD_SIZE, shareCard } from "@/features/share/card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "nuanci 장면 미리보기";

export async function generateStaticParams() {
  return (await getScenes()).map((s) => ({ number: String(s.number) }));
}

// 장면 링크를 공유하면 보이는 카드. 상대 대사와 내가 하고 싶은 말까지만 보여준다
export default async function Image({ params }: { params: Promise<{ number: string }> }) {
  const scene = await getSceneByNumber((await params).number);
  if (!scene) return shareCard({ kicker: "이 말, 영어로 하면?", line: "직역하면 사고 나는 순간들", note: "골라 보기 →" });
  return shareCard({ kicker: scene.title, bubble: scene.base.partnerLine, line: scene.base.intent, note: "너라면 뭐라고 할래? →" });
}
