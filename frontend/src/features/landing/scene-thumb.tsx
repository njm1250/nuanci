"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useHeroLook } from "@/features/rewards/hero-look";
import { C } from "@/features/stage/palette";
import { useThumb } from "@/features/stage/thumb-cache";
import type { StageSpec } from "@/features/stage/types";
import { SET_WALLS } from "@/features/stage/walls";

// three.js는 썸네일을 그릴 때만 받는다. 그리는 동안 카드에는 그 세트의 벽과 바닥만 먼저 보인다
export const ThumbStudio = dynamic(() => import("@/features/stage/thumb-studio").then((m) => m.ThumbStudio), { ssr: false });

// 장면 번호를 시트콤 회차처럼 보여준다
export function episode(n: number) {
  return `EP.${String(n).padStart(2, "0")}`;
}

// 장면 카드의 무대 썸네일. 주인공은 아지트에서 고른 모습 그대로 나온다
export function SceneThumb({ stage, className = "" }: { stage?: StageSpec; className?: string }) {
  const look = useHeroLook();
  const wearKey = JSON.stringify(look.wear);
  const spec = useMemo(() => (stage ? { ...stage, hero: look.hero, wear: JSON.parse(wearKey) } : null), [stage, look.hero, wearKey]);
  const url = useThumb(spec);
  const wall = stage ? SET_WALLS[stage.set][stage.time] : C.paper;
  return (
    <span aria-hidden className={`relative block overflow-hidden ${className}`} style={{ background: wall }}>
      <span className="absolute inset-x-0 bottom-0 h-[18%]" style={{ background: C.floor }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="absolute inset-0 size-full animate-[fade-in_200ms] object-cover [image-rendering:pixelated]" />}
    </span>
  );
}
