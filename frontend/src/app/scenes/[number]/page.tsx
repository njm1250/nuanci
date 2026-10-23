import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSceneByNumber, getScenes, nextSceneNumber } from "@/features/scene/api";
import { ScenePlayer } from "@/features/scene/scene-player";

export async function generateStaticParams() {
  return (await getScenes()).map((s) => ({ number: String(s.number) }));
}

export async function generateMetadata({ params }: PageProps<"/scenes/[number]">): Promise<Metadata> {
  const scene = await getSceneByNumber((await params).number);
  return { title: scene ? `${scene.title} · nuanci` : "nuanci" };
}

async function SceneByNumber({ params }: { params: PageProps<"/scenes/[number]">["params"] }) {
  const { number } = await params;
  const [scene, scenes] = await Promise.all([getSceneByNumber(number), getScenes()]);
  if (!scene) notFound();
  return <ScenePlayer key={scene.id} scene={scene} nextNumber={nextSceneNumber(scenes, scene.id)} />;
}

export default function ScenePage({ params }: PageProps<"/scenes/[number]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-night-deep" />}>
      <SceneByNumber params={params} />
    </Suspense>
  );
}
