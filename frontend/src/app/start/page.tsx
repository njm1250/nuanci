import type { Metadata } from "next";
import { Suspense } from "react";
import { getCatalog, getScene, getScenes } from "@/features/scene/api";
import { SceneRoute } from "@/features/scene/scene-route";
import { FirstVisitGate } from "./first-visit-gate";

// 처음 온 사람이 홈 주소(/)로 오면 proxy.ts가 이 화면을 보여 준다. 소개 화면 없이 첫 장면이 바로 열리고, 끝나면 다음 질문이 이어진다
export const metadata: Metadata = { robots: { index: false, follow: false }, alternates: { canonical: "/" } };

async function FirstScene() {
  const [catalog, scenes] = await Promise.all([getCatalog(), getScenes()]);
  const scene = catalog[0] ? await getScene(catalog[0].id) : null;
  if (!scene) return null;
  return <SceneRoute scene={scene} scenes={scenes} entry="home" />;
}

export default function StartPage() {
  return (
    <>
      <FirstVisitGate />
      <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
        <FirstScene />
      </Suspense>
    </>
  );
}
