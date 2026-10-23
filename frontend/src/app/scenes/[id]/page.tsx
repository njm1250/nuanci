import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SCENES, getScene, nextSceneId } from "@/content/scenes";
import { ScenePlayer } from "@/features/scene/scene-player";

export function generateStaticParams() {
  return SCENES.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/scenes/[id]">): Promise<Metadata> {
  const scene = getScene((await params).id);
  return { title: scene ? `${scene.title} · nuanci` : "nuanci" };
}

async function SceneById({ params }: { params: PageProps<"/scenes/[id]">["params"] }) {
  const scene = getScene((await params).id);
  if (!scene) notFound();
  return <ScenePlayer key={scene.id} scene={scene} nextId={nextSceneId(scene.id)} />;
}

export default function ScenePage({ params }: PageProps<"/scenes/[id]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-night-deep" />}>
      <SceneById params={params} />
    </Suspense>
  );
}
