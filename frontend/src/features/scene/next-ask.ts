"use server";

import { getScene } from "./api";
import { askOf, teaserOf } from "./teaser";

// 장면 끝의 다음 장면이 서버가 미리 받아 둔 장면과 다를 때(기록이 차례대로가 아닐 때) 브라우저가 부른다. 공개 장면만 읽는다
export async function nextAskOf(id: string) {
  const next = await getScene(id);
  return next ? { id, nextAsk: askOf(next), teaser: teaserOf(next) } : null;
}
