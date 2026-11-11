import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSceneByNumber, getScenes } from "@/features/scene/api";
import { SceneRoute } from "@/features/scene/scene-route";
import type { Scene } from "@/features/scene/types";
import { SITE_URL } from "@/features/site/metadata";

export async function generateStaticParams() {
  return (await getScenes()).map((s) => ({ number: String(s.number) }));
}

export async function generateMetadata({ params }: PageProps<"/scenes/[number]">): Promise<Metadata> {
  const scene = await getSceneByNumber((await params).number);
  if (!scene) return { title: "nuanci" };
  const description = `너라면 영어로 뭐라고 할래? ${scene.base.intent}`;
  return { title: `${scene.title} · nuanci`, description, alternates: { canonical: `/scenes/${scene.number}` }, openGraph: { url: `/scenes/${scene.number}`, title: `${scene.title} · nuanci`, description } };
}

// 검색 엔진이 이 주소를 "영어 표현을 배우는 무료 상호작용 학습 자료"로 알아보게 한다. 정답 표현은 장면 안에서만 알 수 있게 넣지 않는다
function sceneLd(scene: Scene) {
  const url = `${SITE_URL}/scenes/${scene.number}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: scene.title,
      description: `${scene.base.context} ${scene.base.intent}`,
      url,
      inLanguage: ["ko", "en"],
      learningResourceType: "interactive dialogue",
      educationalUse: "practice",
      isAccessibleForFree: true,
      about: { "@type": "Thing", name: "영어 회화 뉘앙스" },
      provider: { "@type": "Organization", name: "nuanci", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "nuanci", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "전체 장면", item: `${SITE_URL}/scenes` },
        { "@type": "ListItem", position: 3, name: scene.title, item: url },
      ],
    },
  ];
}

async function SceneByNumber({ params }: { params: PageProps<"/scenes/[number]">["params"] }) {
  const { number } = await params;
  const [scene, scenes] = await Promise.all([getSceneByNumber(number), getScenes()]);
  if (!scene) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sceneLd(scene)).replace(/</g, "\\u003c") }} />
      <SceneRoute scene={scene} scenes={scenes} />
    </>
  );
}

export default function ScenePage({ params }: PageProps<"/scenes/[number]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
      <SceneByNumber params={params} />
    </Suspense>
  );
}
