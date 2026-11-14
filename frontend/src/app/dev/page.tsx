import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCatalog, getScene, getScenes } from "@/features/scene/api";
import { SceneRoute } from "@/features/scene/scene-route";

// 개발자 팩 "첫 PR 머지까지"의 입구. 개발자 채널에 올리는 주소는 전부 /dev?utm_source=… 이다.
// 처음 온 사람에게 첫 장면을 바로 여는 /start처럼 팩 1화를 바로 연다. 일반 첫 방문 흐름(/)에는 섞지 않는다
// 링크를 방에 붙였을 때 뜨는 미리보기도 팩 것으로 맞춘다. openGraph를 따로 적지 않으면 홈의 제목·설명·카드가 그대로 나온다
const DESCRIPTION = "이슈 찜하기부터 첫 머지, 내가 리뷰어가 되기까지. 리뷰 댓글 한 줄이 어떻게 들리는지 골라 보고 바로 확인해요.";
export const metadata: Metadata = {
  title: "첫 PR 머지까지 · 오픈소스 영어",
  description: DESCRIPTION,
  alternates: { canonical: "/dev" },
  openGraph: { siteName: "nuanci", locale: "ko_KR", type: "website", url: "/dev", title: "내 첫 PR, 머지까지 가 볼까? · nuanci", description: DESCRIPTION },
};

async function FirstDevScene() {
  const [catalog, scenes] = await Promise.all([getCatalog(), getScenes()]);
  const first = catalog.find((c) => c.category === "dev");
  const scene = first ? await getScene(first.id) : null;
  // 팩이 아직 공개되지 않았으면 홈으로 보낸다
  if (!scene) redirect("/");
  return <SceneRoute scene={scene} scenes={scenes} entry="home" />;
}

export default function DevPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
      <FirstDevScene />
    </Suspense>
  );
}
