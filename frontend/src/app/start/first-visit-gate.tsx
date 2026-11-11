"use client";

import { useEffect } from "react";
import { hasPlayed, RETURNING_COOKIE, trackHome } from "@/features/scene/track";
import { currentCleared } from "@/features/scene/progress";

// 쿠키가 생기기 전에 다녀간 사람은 이 브라우저 기록으로 알아보고, 쿠키를 남긴 뒤 원래 홈으로 돌려보낸다.
// 처음 온 사람이면 홈 방문으로 남겨서 홈 → 장면 시작 지표가 예전과 같은 기준으로 이어진다
export function FirstVisitGate() {
  useEffect(() => {
    if (hasPlayed() || currentCleared().length > 0) {
      document.cookie = `${RETURNING_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
      location.replace("/");
      return;
    }
    trackHome();
  }, []);
  return null;
}
