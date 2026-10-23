"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BACKEND, SCENES_TAG } from "@/features/scene/api";
import { adminFetch } from "./api";
import { ADMIN_COOKIE } from "./cookie";

export type FormState = { error?: string; warnings?: string[]; ok?: string; id?: string } | null;

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

// 붙여 넣은 장면 JSON을 검사하거나 저장한다. 저장하면 공개 화면 캐시를 바로 비운다
export async function saveScene(_: FormState, form: FormData): Promise<FormState> {
  const text = String(form.get("json") ?? "");
  const dryRun = form.get("intent") === "check";
  let id: unknown;
  try {
    id = JSON.parse(text).id;
  } catch {
    return { error: "JSON 형식이 올바르지 않아요" };
  }
  if (typeof id !== "string" || !id) return { error: "id가 없어요" };

  const res = await adminFetch(`/api/admin/scenes/${encodeURIComponent(id)}?dryRun=${dryRun}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: text,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { error: body.message ?? `저장하지 못했어요 (${res.status})` };
  if (dryRun) {
    const what = body.created ? "새 장면으로 들어가요" : body.changed ? `새 버전(v${body.version})으로 저장돼요` : "바뀐 내용이 없어요";
    return { ok: `검사 통과. ${what}`, warnings: body.warnings };
  }
  updateTag(SCENES_TAG);
  redirect(`/admin/scenes/${id}?saved=1`);
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
