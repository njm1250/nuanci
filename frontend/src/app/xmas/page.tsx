import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCatalog, getScene } from "@/features/scene/api";
import { SceneRoute } from "@/features/scene/scene-route";
import { SkipCleared } from "@/features/scene/skip-cleared";

// 크리스마스 특집의 홍보 입구(/xmas). 소개 화면 없이 특집 장면을 바로 연다(/dev와 같은 방식).
// 서버는 기록을 모르므로 특집 첫 장면을 열고, 이미 해 본 장면이면 브라우저가 특집의 안 해 본 첫 장면으로 바꾼다. 특집 장면이 없으면 홈으로
const SLUG = "xmas";
const DESCRIPTION = "크리스마스에 하고 싶은 말, 영어로 하면 어떻게 들릴까? 골라 보면 상대 반응이 바로 나와요.";
export const metadata: Metadata = {
  title: "크리스마스 특집 · nuanci",
  description: DESCRIPTION,
  alternates: { canonical: "/xmas" },
  openGraph: { siteName: "nuanci", locale: "ko_KR", type: "website", url: "/xmas", title: "크리스마스 특집 · nuanci", description: DESCRIPTION },
};

async function FirstFeatureScene() {
  const lane = (await getCatalog()).filter((c) => c.category === SLUG);
  const scene = lane[0] ? await getScene(lane[0].id) : null;
  if (!scene) redirect("/");
  return (
    <>
      <SkipCleared lane={lane.map(({ id, number }) => ({ id, number }))} />
      <SceneRoute scene={scene} entry="home" />
    </>
  );
}

export default function XmasPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
      <FirstFeatureScene />
    </Suspense>
  );
}
