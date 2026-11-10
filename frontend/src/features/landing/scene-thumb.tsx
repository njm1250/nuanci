"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHeroLook } from "@/features/rewards/hero-look";
import { C } from "@/features/stage/palette";
import { useThumb, useThumbJobs } from "@/features/stage/thumb-cache";
import type { StageSpec } from "@/features/stage/types";
import { SET_WALLS } from "@/features/stage/walls";
import { useIdle } from "./use-idle";

// three.js는 그릴 썸네일이 남아 있을 때만, 페이지가 한가해진 뒤에 받는다. 그리는 동안 카드에는 그 세트의 벽과 바닥만 먼저 보인다
const Studio = dynamic(() => import("@/features/stage/thumb-studio").then((m) => m.ThumbStudio), { ssr: false });

export function ThumbStudio() {
  const jobs = useThumbJobs();
  const idle = useIdle();
  return jobs && idle ? <Studio /> : null;
}

// 카드가 화면에 가까이 왔는지. 한 번 가까워지면 계속 true다. 장면이 많아도 보이는 카드의 썸네일만 그린다
function useNear(ref: React.RefObject<HTMLElement | null>) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, near]);
  return near;
}

// 장면 카드의 무대 썸네일. 주인공은 아지트에서 고른 모습 그대로 나온다
export function SceneThumb({ stage, className = "" }: { stage?: StageSpec; className?: string }) {
  const look = useHeroLook();
  const wearKey = JSON.stringify(look.wear);
  const spec = useMemo(() => (stage ? { ...stage, hero: look.hero, wear: JSON.parse(wearKey) } : null), [stage, look.hero, wearKey]);
  const box = useRef<HTMLSpanElement>(null);
  const url = useThumb(spec, useNear(box));
  const wall = stage ? SET_WALLS[stage.set][stage.time] : C.paper;
  return (
    <span ref={box} aria-hidden className={`relative block overflow-hidden ${className}`} style={{ background: wall }}>
      <span className="absolute inset-x-0 bottom-0 h-[18%]" style={{ background: C.floor }} />
      {/* 그림이 차례를 기다리는 동안 빈 벽만 있으면 깨진 그림처럼 보여서, 무대 말풍선과 같은 점 세 개로 그리는 중임을 알린다 */}
      {!url && stage && (
        <span className="absolute inset-0 flex items-center justify-center gap-[3px] pb-[18%] motion-safe:animate-pulse">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-[4px] bg-ink/35" />
          ))}
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="absolute inset-0 size-full animate-fade object-cover [image-rendering:pixelated]" />}
    </span>
  );
}
