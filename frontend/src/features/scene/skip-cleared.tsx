"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCleared } from "./progress";

// 특집 입구에서 서버가 연 첫 장면을 이미 해 봤으면, 특집의 안 해 본 첫 장면 주소로 바꾼다. 다 해 봤으면 그대로 첫 장면에 둔다
export function SkipCleared({ lane }: { lane: { id: string; number: number }[] }) {
  const cleared = useCleared();
  const router = useRouter();
  const target = cleared.includes(lane[0]?.id) ? lane.find((s) => !cleared.includes(s.id)) : undefined;
  useEffect(() => {
    if (target) router.replace(`/scenes/${target.number}${location.search}`);
  }, [target, router]);
  return null;
}
