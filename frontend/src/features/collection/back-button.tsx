"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

// 앱 안에서 넘어왔으면 보던 화면(예: 장면 완료 화면)으로 돌아가는 버튼. 링크로 바로 들어왔으면 숨긴다
export function BackButton() {
  const router = useRouter();
  const canGoBack = useSyncExternalStore(noop, () => window.history.length > 1, () => false);
  if (!canGoBack) return null;
  return (
    <button type="button" onClick={() => router.back()} className="-mr-2 ml-auto flex h-11 items-center gap-2 px-2 font-pixel text-[15px] text-paper-muted hover:text-paper">
      <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="rotate-180 fill-current">
        <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
      </svg>
      돌아가기
    </button>
  );
}
