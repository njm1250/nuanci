import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getScenes, SCENES_TAG } from "@/features/scene/api";
import { SITE_URL } from "@/features/site/metadata";

// 공개 장면만 싣고, 관리자가 공개 상태를 바꾸면 기존 장면 캐시와 함께 갱신한다
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SCENES_TAG);
  const scenes = await getScenes();
  return [
    ...["", "/scenes", "/privacy", "/terms"].map((path) => ({ url: `${SITE_URL}${path}` })),
    ...scenes.map((scene) => ({ url: `${SITE_URL}/scenes/${scene.number}` })),
  ];
}
