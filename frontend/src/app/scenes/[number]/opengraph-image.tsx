import { getSceneByNumber, getScenes } from "@/features/scene/api";
import { CARD_SIZE, homeCard, sceneCard } from "@/features/share/card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "nuanci 장면 미리보기";

export async function generateStaticParams() {
  return (await getScenes()).map((s) => ({ number: String(s.number) }));
}

// 장면 링크를 공유하면 보이는 카드. 상대 대사와 내가 하고 싶은 말까지만 보여준다
export default async function Image({ params }: { params: Promise<{ number: string }> }) {
  const scene = await getSceneByNumber((await params).number);
  if (!scene) return homeCard();
  return sceneCard({ number: scene.number, title: scene.title, partnerName: scene.partnerName, partnerLine: scene.base.partnerLine, intent: scene.base.intent });
}
