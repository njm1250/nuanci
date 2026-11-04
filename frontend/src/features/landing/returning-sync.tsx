"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { hasPlayed } from "@/features/scene/track";
import { useCleared } from "@/features/scene/progress";

// 소개 화면(/?intro) 모드. 홈 안에서 / 와 /?intro 사이를 오가면 페이지를 새로 읽지 않으므로,
// 처음 한 번만 도는 인라인 스크립트 대신 주소가 바뀔 때마다 여기서 다시 맞춘다
let intro = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("intro");
const listeners = new Set<() => void>();

export function useIntroMode() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    () => intro,
    () => false,
  );
}

// html의 data-returning(CSS로 첫 방문 구역을 숨기는 표시)과 컴포넌트가 보는 "다시 온 사람" 판단을 같은 값으로 맞춘다
export function ReturningSync() {
  const params = useSearchParams();
  const cleared = useCleared();
  const played = useSyncExternalStore(() => () => {}, hasPlayed, () => false);
  const on = params.has("intro");
  useEffect(() => {
    if (intro !== on) {
      intro = on;
      listeners.forEach((l) => l());
    }
    const returning = played || cleared.length > 0;
    document.documentElement.toggleAttribute("data-returning", !on && returning);
    // 홈을 떠나면 소개 모드를 풀어, 다른 화면에서는 원래대로 다시 온 사람으로 보이게 한다
    return () => void document.documentElement.toggleAttribute("data-returning", returning);
  }, [on, played, cleared.length]);
  return null;
}
