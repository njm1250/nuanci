"use server";

import { revalidatePath, updateTag } from "next/cache";
import { adminFetch, getAdminJson } from "./api";
import { PROGRESSION_TAG } from "@/features/progression/api";
import type {
  ProgressionAdmin,
  ProgressionRules,
  ProgressionSettings,
} from "@/features/progression/types";

export async function loadProgressionSettings() {
  const data = await getAdminJson<ProgressionAdmin>(
    "/api/admin/settings/progression",
  );
  if (!data) throw new Error("운영 설정을 불러오지 못했습니다.");
  return data;
}

export async function saveProgressionSettings(
  version: number,
  rules: ProgressionRules,
): Promise<{ settings?: ProgressionSettings; error?: string }> {
  const response = await adminFetch("/api/admin/settings/progression", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version, rules }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return {
      error: body.message ?? `설정을 저장하지 못했습니다 (${response.status}).`,
    };
  }
  const settings = (await response.json()) as ProgressionSettings;
  updateTag(PROGRESSION_TAG);
  revalidatePath("/admin/settings");
  revalidatePath("/me");
  return { settings };
}
