import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getScenes, SCENES_TAG } from "@/features/scene/api";
import { SITE_URL } from "@/features/site/metadata";
import { TYPE_IDS } from "@/features/typetest/types";
import { getLearnEntries } from "@/features/learn/learn";
import { CLOSED_PATHS } from "@/features/site/lean";

// 공개 장면과 테스트 유형 결과 주소를 싣고, 관리자가 공개 상태를 바꾸면 기존 장면 캐시와 함께 갱신한다.
// 입구를 닫아 둔 기능의 주소(site/lean.ts)는 홈으로 리디렉션되므로 싣지 않는다. 실으면 검색엔진이 "리디렉션이 포함된 페이지"로 색인하지 않는다
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SCENES_TAG);
  const scenes = await getScenes();
  const learn = await getLearnEntries();
  const paths = [
    ...["", "/scenes", "/learn", "/expressions", "/test", "/privacy", "/terms"],
    ...TYPE_IDS.map((type) => `/test/r/${type}`),
    ...scenes.map((scene) => `/scenes/${scene.number}`),
    ...learn.map((e) => `/learn/${e.slug}`),
  ];
  const open = paths.filter((path) => !CLOSED_PATHS.some((p) => path === p || path.startsWith(`${p}/`)));
  return open.map((path) => ({ url: `${SITE_URL}${path}` }));
}
