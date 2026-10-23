import { cacheLife, cacheTag } from "next/cache";
import type { Scene, SceneSummary } from "./types";

export const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

// 관리자가 장면을 저장하거나 공개 상태를 바꾸면 이 태그로 캐시를 바로 비운다
export const SCENES_TAG = "scenes";

export async function getScenes(): Promise<SceneSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SCENES_TAG);
  const res = await fetch(`${BACKEND}/api/scenes`);
  if (!res.ok) throw new Error(`장면 목록을 불러오지 못했어요 (${res.status})`);
  return res.json();
}

export async function getScene(id: string): Promise<Scene | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SCENES_TAG);
  const res = await fetch(`${BACKEND}/api/scenes/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`장면을 불러오지 못했어요 (${res.status})`);
  return res.json();
}

// 공개 주소는 장면 번호를 쓰고, 내부 id는 콘텐츠와 지표에서만 쓴다
export async function getSceneByNumber(number: string): Promise<Scene | null> {
  const summary = (await getScenes()).find((s) => String(s.number) === number);
  return summary ? getScene(summary.id) : null;
}
