import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSceneByNumber, getScenes } from "@/features/scene/api";
import { ScenePlayer } from "@/features/scene/scene-player";

export async function generateStaticParams() {
  return (await getScenes()).map((s) => ({ number: String(s.number) }));
}

export async function generateMetadata({ params }: PageProps<"/scenes/[number]">): Promise<Metadata> {
  const scene = await getSceneByNumber((await params).number);
  if (!scene) return { title: "nuanci" };
  const description = `"${scene.base.partnerLine}" 너라면 영어로 뭐라고 할래?`;
  return { title: `${scene.title} · nuanci`, description, openGraph: { title: `${scene.title} · nuanci`, description } };
}

async function SceneByNumber({ params }: { params: PageProps<"/scenes/[number]">["params"] }) {
  const { number } = await params;
  const [scene, scenes] = await Promise.all([getSceneByNumber(number), getScenes()]);
  if (!scene) notFound();
  return <ScenePlayer key={scene.id} scene={scene} order={scenes.map(({ id, number }) => ({ id, number }))} />;
}

export default function ScenePage({ params }: PageProps<"/scenes/[number]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-night-deep" />}>
      <SceneByNumber params={params} />
    </Suspense>
  );
}
