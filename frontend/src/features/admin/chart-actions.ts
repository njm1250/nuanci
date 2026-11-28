"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminFetch } from "./api";
import type { ChartKind } from "./query-chart";

export type AdminChart = {
  id: number;
  title: string;
  description: string | null;
  sql: string;
  kind: ChartKind;
  xCol: string | null;
  yCol: string | null;
  splitCol: string | null;
  width: number;
};
export type SaveChartState = { error?: string } | null;

// 콘솔에서 지금 조회와 차트 설정을 보드에 저장한다. id가 있으면 그 차트를 고친다. 저장하면 보드로 간다
export async function saveChart(_: SaveChartState, form: FormData): Promise<SaveChartState> {
  const id = String(form.get("id") ?? "");
  const text = (key: string) => {
    const v = String(form.get(key) ?? "").trim();
    return v || null;
  };
  const body = {
    title: text("title"),
    description: text("description"),
    sql: text("sql"),
    kind: text("kind"),
    xCol: text("xCol"),
    yCol: text("yCol"),
    splitCol: text("splitCol"),
    width: Number(form.get("width") ?? 2),
  };
  if (!body.title) return { error: "차트 이름을 적어 주세요" };
  const res = await adminFetch(id ? `/api/admin/charts/${id}` : "/api/admin/charts", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.message ?? `저장하지 못했습니다 (${res.status})` };
  }
  revalidatePath("/admin/board");
  redirect("/admin/board");
}

export async function deleteChart(form: FormData) {
  await adminFetch(`/api/admin/charts/${Number(form.get("id"))}`, { method: "DELETE" });
  revalidatePath("/admin/board");
}

export async function moveChart(form: FormData) {
  const dir = form.get("dir") === "up" ? "up" : "down";
  await adminFetch(`/api/admin/charts/${Number(form.get("id"))}/move?dir=${dir}`, { method: "POST" });
  revalidatePath("/admin/board");
}
