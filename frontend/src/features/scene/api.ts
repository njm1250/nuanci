import { cacheLife, cacheTag } from "next/cache";
import type { BookEntry } from "@/features/collection/pairs";
import type { ReelBeat } from "@/features/landing/reel";
import type { StageSpec } from "@/features/stage/types";
import type { Scene, SceneSummary } from "./types";

export const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

// 발행된 장면 파일을 내보내는 CDN 주소(예: https://….cloudfront.net/prod). 비어 있으면 백엔드 API에서 같은 내용을 읽는다
const CONTENT = process.env.CONTENT_URL;

type ContentKind = "manifests" | "scenes" | "views";
function backendUrl(kind: ContentKind | "current", hash: string) {
  return kind === "current" ? `${BACKEND}/api/content/current` : `${BACKEND}/api/content/${kind === "scenes" ? "objects" : kind}/${hash}`;
}

// CDN에 아직 없으면(첫 발행 전, 발행이 늦을 때) 같은 내용을 주는 백엔드에서 읽는다. 주소가 해시라 어느 쪽에서 받아도 내용이 같다
async function fetchContent(kind: ContentKind | "current", hash = ""): Promise<Response> {
  if (CONTENT) {
    const res = await fetch(kind === "current" ? `${CONTENT}/current.json` : `${CONTENT}/${kind}/${hash}.json`).catch(() => null);
    if (res?.ok) return res;
  }
  return fetch(backendUrl(kind, hash));
}

// 관리자가 장면을 저장하거나 공개 상태를 바꾸면 이 태그로 캐시를 바로 비운다
export const SCENES_TAG = "scenes";

// 목차 한 줄. 목록 화면은 장면 본문 없이 이것만으로 그린다
export type CatalogEntry = SceneSummary & { relation: string; place: string; category?: "meme"; stage?: StageSpec; hash: string };

// 지금 목차의 해시만 짧게 확인한다. 만료는 길게 둬서, 백엔드가 응답하지 않으면 마지막으로 받은 목차를 계속 쓴다
async function currentManifest(): Promise<string> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 30, expire: 60 * 60 * 24 * 30 });
  cacheTag(SCENES_TAG);
  const res = await fetchContent("current");
  if (!res.ok) throw new Error(`장면 목차를 확인하지 못했어요 (${res.status})`);
  return (await res.json()).manifest;
}

// 목차와 장면 본문은 내용 해시로 부르므로 한 번 받으면 바뀌지 않는다. 그래서 무효화 없이 계속 캐시한다
// 화면별로 미리 만든 데이터의 이름. 백엔드 SceneViews와 같다
type ViewName = "book" | "reel";
type Manifest = { scenes: CatalogEntry[]; views: Record<ViewName, string> };

async function manifest(hash: string): Promise<Manifest> {
  "use cache";
  cacheLife("max");
  const res = await fetchContent("manifests", hash);
  if (!res.ok) throw new Error(`장면 목차를 불러오지 못했어요 (${res.status})`);
  return res.json();
}

async function view(hash: string): Promise<unknown> {
  "use cache";
  cacheLife("max");
  const res = await fetchContent("views", hash);
  if (!res.ok) throw new Error(`화면 데이터를 불러오지 못했어요 (${res.status})`);
  return res.json();
}

async function sceneObject(hash: string): Promise<Scene> {
  "use cache";
  cacheLife("max");
  const res = await fetchContent("scenes", hash);
  if (!res.ok) throw new Error(`장면을 불러오지 못했어요 (${res.status})`);
  return res.json();
}

export async function getCatalog(): Promise<CatalogEntry[]> {
  return (await manifest(await currentManifest())).scenes;
}

// 표현 모음과 아지트가 쓰는 장면별 표현 한 쌍. 장면 본문 전체를 받지 않고 발행할 때 만든 결과를 받는다
export async function getBook(): Promise<BookEntry[]> {
  return (await view((await manifest(await currentManifest())).views.book)) as BookEntry[];
}

// 첫 방문자에게 보여 줄 홈 데모
export async function getReel(): Promise<ReelBeat[]> {
  return (await view((await manifest(await currentManifest())).views.reel)) as ReelBeat[];
}

export async function getScenes(): Promise<SceneSummary[]> {
  return (await getCatalog()).map(({ id, number, title, version }) => ({ id, number, title, version }));
}

export async function getScene(id: string): Promise<Scene | null> {
  const entry = (await getCatalog()).find((s) => s.id === id);
  // 버전은 본문 주소에 넣지 않고 목차에서 붙인다. 내용을 되돌리면 예전 주소를 다시 쓴다
  return entry ? { ...(await sceneObject(entry.hash)), version: entry.version } : null;
}

// 공개 주소는 장면 번호를 쓰고, 내부 id는 콘텐츠와 지표에서만 쓴다
export async function getSceneByNumber(number: string): Promise<Scene | null> {
  const summary = (await getScenes()).find((s) => String(s.number) === number);
  return summary ? getScene(summary.id) : null;
}
