import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAdminScene } from "@/features/admin/api";
import { ScenePlayer } from "@/features/scene/scene-player";

export const metadata: Metadata = { title: "미리보기 · nuanci" };

async function Preview({ params }: { params: PageProps<"/admin/preview/[id]">["params"] }) {
  const { id } = await params;
  const scene = await getAdminScene(id);
  if (!scene) notFound();
  return <ScenePlayer key={scene.id} scene={scene} preview />;
}

export default function PreviewPage({ params }: PageProps<"/admin/preview/[id]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
      <Preview params={params} />
    </Suspense>
  );
}
