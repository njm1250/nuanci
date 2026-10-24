import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BACKEND } from "@/features/scene/api";
import type { Scene } from "@/features/scene/types";
import { ADMIN_COOKIE } from "./cookie";

export type AdminScene = {
  id: string;
  number: number;
  title: string;
  status: "draft" | "published" | "hidden";
  order: number;
  version: number;
  updatedAt: string;
  warnings: string[];
};

export type AdminSceneContent = Scene & { status: AdminScene["status"] };

// 로그인 쿠키의 세션 토큰을 붙여 BE 관리자 API를 부른다. 세션이 끝났으면 로그인 화면으로 보낸다
export async function adminFetch(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) redirect("/admin/login");
  const res = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) redirect("/admin/login");
  return res;
}

async function json<T>(path: string): Promise<T | null> {
  const res = await adminFetch(path);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`관리자 데이터를 불러오지 못했어요 (${res.status})`);
  return res.json();
}

export async function getAdminScenes() {
  return (await json<AdminScene[]>("/api/admin/scenes")) ?? [];
}

export function getAdminScene(id: string) {
  return json<AdminSceneContent>(`/api/admin/scenes/${encodeURIComponent(id)}`);
}

export function getAdminJson<T>(path: string) {
  return json<T>(path);
}
