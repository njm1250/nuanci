import { cacheLife, cacheTag } from "next/cache";
import { BACKEND } from "@/features/scene/api";
import type { RankRule } from "./types";

export const PROGRESSION_TAG = "progression-settings";

export async function getRanks(): Promise<{
  version: number;
  ranks: RankRule[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROGRESSION_TAG);
  const response = await fetch(`${BACKEND}/api/progression/ranks`);
  if (!response.ok)
    throw new Error(`직급 정보를 불러오지 못했습니다 (${response.status}).`);
  return response.json();
}
