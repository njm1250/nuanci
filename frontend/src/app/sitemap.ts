import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getScenes, SCENES_TAG } from "@/features/scene/api";
import { SITE_URL } from "@/features/site/metadata";
import { TYPE_IDS } from "@/features/typetest/types";

// 공개 장면과 테스트 유형 결과 주소를 싣고, 관리자가 공개 상태를 바꾸면 기존 장면 캐시와 함께 갱신한다
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SCENES_TAG);
  const scenes = await getScenes();
  return [
    ...["", "/scenes", "/test", "/privacy", "/terms"].map((path) => ({ url: `${SITE_URL}${path}` })),
    ...TYPE_IDS.map((type) => ({ url: `${SITE_URL}/test/r/${type}` })),
    ...scenes.map((scene) => ({ url: `${SITE_URL}/scenes/${scene.number}` })),
  ];
}
