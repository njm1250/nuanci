"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BACKEND, SCENES_TAG } from "@/features/scene/api";
import { adminFetch, getAdminScene } from "./api";
import { ADMIN_COOKIE } from "./cookie";

export type SceneResult = { id: string; ok?: string; error?: string; warnings?: string[] };

export type FormState = { error?: string; warnings?: string[]; ok?: string; id?: string; results?: SceneResult[] } | null;

// 지표에서 선택한 장면의 보기만 필요할 때 가져와 전체 목록의 반복 조회를 피한다.
export async function loadMetricScene(id: string) {
  return getAdminScene(id);
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const res = await fetch(`${BACKEND}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: form.get("id"), password: form.get("password") }),
    cache: "no-store",
  });
  if (!res.ok) return { error: "아이디나 비밀번호가 맞지 않아요", id: String(form.get("id") ?? "") };
  const { token } = await res.json();
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin");
}

export async function logout() {
  await adminFetch("/api/admin/logout", { method: "POST" }).catch(() => null);
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

async function putScene(scene: unknown, body: string, dryRun: boolean): Promise<SceneResult> {
  const id = (scene as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || !id) return { id: "?", error: "id가 없어요" };
  const res = await adminFetch(`/api/admin/scenes/${encodeURIComponent(id)}?dryRun=${dryRun}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) return { id, error: result.message ?? `저장하지 못했어요 (${res.status})` };
  const what = result.created ? "새 장면" : result.changed ? `새 버전(v${result.version})` : "바뀐 내용 없음";
  return { id, ok: dryRun ? `검사 통과 · 저장하면 ${what}` : `저장 · ${what}`, warnings: result.warnings };
}

// 붙여 넣은 장면 JSON을 검사하거나 저장한다. 배열이면 장면마다 따로 처리하고, 저장하면 공개 화면 캐시를 바로 비운다
export async function saveScene(_: FormState, form: FormData): Promise<FormState> {
  const text = String(form.get("json") ?? "");
  const dryRun = form.get("intent") === "check";
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "JSON 형식이 올바르지 않아요" };
  }

  if (!Array.isArray(parsed)) {
    const result = await putScene(parsed, text, dryRun);
    if (result.error) return { error: result.error };
    if (dryRun) return { ok: result.ok, warnings: result.warnings };
    updateTag(SCENES_TAG);
    redirect(`/admin/scenes/${result.id}?saved=1`);
  }

  if (parsed.length === 0) return { error: "장면이 없어요" };
  const results: SceneResult[] = [];
  for (const scene of parsed) results.push(await putScene(scene, JSON.stringify(scene), dryRun));
  if (!dryRun && results.some((r) => !r.error)) updateTag(SCENES_TAG);
  return { results };
}

export async function setSceneStatus(id: string, status: string) {
  await adminFetch(`/api/admin/scenes/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  updateTag(SCENES_TAG);
  redirect(`/admin/scenes/${id}`);
}

export async function markInternalVisitor(visitorId: string) {
  await adminFetch("/api/admin/metrics/internal-visitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId }),
  });
}

// 장면 전체 순서를 저장하고 공개 화면 캐시를 바로 비운다
export async function reorderScenes(ids: string[]): Promise<{ error?: string }> {
  const res = await adminFetch("/api/admin/scene-order", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) return { error: (await res.json().catch(() => ({}))).message ?? `저장하지 못했어요 (${res.status})` };
  updateTag(SCENES_TAG);
  return {};
}

// 문의를 처리함/처리 전으로 바꾼다
export async function markInquiry(id: number, done: boolean) {
  await adminFetch(`/api/admin/inquiries/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }) });
  revalidatePath("/admin/inquiries");
}
