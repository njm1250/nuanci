import { cacheLife, cacheTag } from "next/cache";
import type { StageSpec } from "@/features/stage/types";
import type { Scene, SceneSummary } from "./types";

export const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

// 관리자가 장면을 저장하거나 공개 상태를 바꾸면 이 태그로 캐시를 바로 비운다
export const SCENES_TAG = "scenes";

// 목차 한 줄. 목록 화면은 장면 본문 없이 이것만으로 그린다
export type CatalogEntry = SceneSummary & { relation: string; place: string; category?: "meme"; stage?: StageSpec; hash: string };

// 지금 목차의 해시만 짧게 확인한다. 만료는 길게 둬서, 백엔드가 응답하지 않으면 마지막으로 받은 목차를 계속 쓴다
async function currentManifest(): Promise<string> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 30, expire: 60 * 60 * 24 * 30 });
  cacheTag(SCENES_TAG);
  const res = await fetch(`${BACKEND}/api/content/current`);
  if (!res.ok) throw new Error(`장면 목차를 확인하지 못했어요 (${res.status})`);
  return (await res.json()).manifest;
}

// 목차와 장면 본문은 내용 해시로 부르므로 한 번 받으면 바뀌지 않는다. 그래서 무효화 없이 계속 캐시한다
async function manifest(hash: string): Promise<CatalogEntry[]> {
  "use cache";
  cacheLife("max");
  const res = await fetch(`${BACKEND}/api/content/manifests/${hash}`);
  if (!res.ok) throw new Error(`장면 목차를 불러오지 못했어요 (${res.status})`);
  return (await res.json()).scenes;
}

async function sceneObject(hash: string): Promise<Scene> {
  "use cache";
  cacheLife("max");
  const res = await fetch(`${BACKEND}/api/content/objects/${hash}`);
  if (!res.ok) throw new Error(`장면을 불러오지 못했어요 (${res.status})`);
  return res.json();
}

export async function getCatalog(): Promise<CatalogEntry[]> {
  return manifest(await currentManifest());
}

export async function getScenes(): Promise<SceneSummary[]> {
  return (await getCatalog()).map(({ id, number, title, version }) => ({ id, number, title, version }));
}

export async function getScene(id: string): Promise<Scene | null> {
  const entry = (await getCatalog()).find((s) => s.id === id);
  return entry ? sceneObject(entry.hash) : null;
}

// 공개 주소는 장면 번호를 쓰고, 내부 id는 콘텐츠와 지표에서만 쓴다
export async function getSceneByNumber(number: string): Promise<Scene | null> {
  const summary = (await getScenes()).find((s) => String(s.number) === number);
  return summary ? getScene(summary.id) : null;
}
