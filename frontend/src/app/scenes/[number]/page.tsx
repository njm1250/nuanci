import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getScene, getSceneByNumber, getScenes } from "@/features/scene/api";
import { ScenePlayer } from "@/features/scene/scene-player";
import { teaserOf } from "@/features/scene/teaser";

export async function generateStaticParams() {
  return (await getScenes()).map((s) => ({ number: String(s.number) }));
}

export async function generateMetadata({ params }: PageProps<"/scenes/[number]">): Promise<Metadata> {
  const scene = await getSceneByNumber((await params).number);
  if (!scene) return { title: "nuanci" };
  const description = `너라면 영어로 뭐라고 할래? ${scene.base.intent}`;
  return { title: `${scene.title} · nuanci`, description, alternates: { canonical: `/scenes/${scene.number}` }, openGraph: { url: `/scenes/${scene.number}`, title: `${scene.title} · nuanci`, description } };
}

async function SceneByNumber({ params }: { params: PageProps<"/scenes/[number]">["params"] }) {
  const { number } = await params;
  const [scene, scenes] = await Promise.all([getSceneByNumber(number), getScenes()]);
  if (!scene) notFound();
  // 끝난 화면의 다음 장면 예고. 다음 장면은 목록의 바로 다음이고(progress.nextScene과 같은 규칙), 본문은 해시 주소로 캐시돼 있다
  const nextId = scenes[scenes.findIndex((s) => s.id === scene.id) + 1]?.id;
  const next = nextId ? await getScene(nextId) : null;
  return <ScenePlayer key={scene.id} scene={scene} order={scenes.map(({ id, number }) => ({ id, number }))} teaser={next && teaserOf(next)} />;
}

export default function ScenePage({ params }: PageProps<"/scenes/[number]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-night-deep" />}>
      <SceneByNumber params={params} />
    </Suspense>
  );
}
