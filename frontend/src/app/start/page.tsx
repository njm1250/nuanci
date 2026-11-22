import type { Metadata } from "next";
import { Suspense } from "react";
import { getCatalog, getScene } from "@/features/scene/api";
import { SceneRoute } from "@/features/scene/scene-route";
import { FirstVisitGate } from "./first-visit-gate";

// 처음 온 사람이 홈 주소(/)로 오면 proxy.ts가 이 화면을 보여 준다. 소개 화면 없이 첫 장면이 바로 열리고, 끝나면 다음 질문이 이어진다
// 이 화면은 홈 주소(/)에서 나간다. noindex를 달면 봇 목록에 없는 크롤러가 홈을 색인에서 빼므로 막지 않고, 대표 주소만 /로 알린다
export const metadata: Metadata = { alternates: { canonical: "/" } };

async function FirstScene() {
  const catalog = await getCatalog();
  const scene = catalog[0] ? await getScene(catalog[0].id) : null;
  if (!scene) return null;
  return <SceneRoute scene={scene} entry="home" />;
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
