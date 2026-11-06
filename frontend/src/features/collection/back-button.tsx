"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// 이번에 페이지를 연 뒤로 사이트 안에서 화면을 옮긴 적이 있는지. 구글 로그인처럼 바깥을 거쳐 돌아오면 다시 false가 된다
let movedInApp = false;

// 루트 레이아웃에 두고 사이트 안 이동을 기록한다
export function NavTracker() {
  const pathname = usePathname();
  const first = useRef(pathname);
  useEffect(() => {
    if (pathname !== first.current) movedInApp = true;
  }, [pathname]);
  return null;
}

// 사이트 안에서 넘어왔으면 보던 화면으로 돌아가고, 링크로 바로 들어왔거나 로그인처럼 바깥을 거쳐 왔으면 상위 화면으로 간다
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (movedInApp ? router.back() : router.push(fallback))}
      className="flex h-11 items-center gap-2 font-pixel text-ui text-paper-muted hover:text-paper"
    >
      <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="rotate-180 fill-current">
        <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
      </svg>
      돌아가기
    </button>
  );
}
