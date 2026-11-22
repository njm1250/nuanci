"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { FEATURE_LIST, type FeatureDecor } from "@/features/scene/collections";
import { useReducedMotion } from "@/features/scene/use-scene-flow";
import { useSeason, useSnowOn } from "./season";

// 지금 홈에 걸 장식 단계. 장면이 있는 기간 중 특집 가운데 우선순위가 가장 높은 것의 단계를 쓴다
export function useLiveDecor(slugs: string[]): FeatureDecor {
  const season = useSeason();
  const lead = FEATURE_LIST.filter((f) => f.kind === "season" && season.states[f.slug] === "live" && slugs.includes(f.slug)).sort((a, b) => a.priority - b.priority)[0];
  return lead?.decor ?? "off";
}

// 머리줄 띠 아래 가장자리에 다는 도트 전구 줄. 전선 한 줄에 네모 전구가 세 가지 색으로 번갈아 달린다. 움직이지 않는다
export function BandLights({ slugs }: { slugs: string[] }) {
  if (useLiveDecor(slugs) === "off") return null;
  return <LightString className="bottom-0" />;
}

// 전구 줄 한 가닥. 특집 카드 위 가장자리에도 건다
export function LightString({ className = "" }: { className?: string }) {
  const id = useId();
  return (
    <svg aria-hidden className={`pointer-events-none absolute inset-x-0 h-2 w-full ${className}`} shapeRendering="crispEdges">
      <defs>
        <pattern id={id} width="36" height="8" patternUnits="userSpaceOnUse">
          <rect x="0" y="1" width="36" height="1" className="fill-white/40" />
          <rect x="5" y="2" width="4" height="4" className="fill-warn" />
          <rect x="17" y="2" width="4" height="4" className="fill-good" />
          <rect x="29" y="2" width="4" height="4" className="fill-bad" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

// 특집 표지 위의 정적 장식: 위 가장자리에 쌓인 눈과 멈춰 있는 눈송이 몇 개. 표지 그림이 있는 칸 안에 겹쳐 그린다
export function CoverSnow({ decor }: { decor: FeatureDecor }) {
  const id = useId();
  if (decor === "off") return null;
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" shapeRendering="crispEdges">
      <defs>
        <pattern id={id} width="16" height="6" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="16" height="3" className="fill-white" />
          <rect x="2" y="3" width="6" height="2" className="fill-white" />
          <rect x="11" y="3" width="3" height="1" className="fill-white" />
        </pattern>
      </defs>
      <rect width="100%" height="6" fill={`url(#${id})`} />
      {COVER_FLAKES.map(([x, y, s], i) => (
        <rect key={i} x={`${x}%`} y={`${y}%`} width={s} height={s} className="fill-white" />
      ))}
    </svg>
  );
}

const COVER_FLAKES: [number, number, number][] = [
  [8, 30, 3],
  [22, 55, 2],
  [41, 22, 3],
  [63, 44, 2],
  [78, 26, 3],
  [90, 60, 2],
];

// 내리는 눈송이. 자리·크기·속도는 고정 씨앗에서 뽑아 그릴 때마다 같다. 음수 지연으로 처음부터 화면 곳곳에 떠 있다.
// 값마다 따로 섞는 난수(mulberry32)를 쓴다. i에 비례하는 식으로 만들면 자리와 지연이 같이 늘어 눈이 대각선 한 줄로 떨어진다
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const FLAKES = (() => {
  const r = seeded(20261225);
  return Array.from({ length: 26 }, () => ({ left: r() * 100, size: r() > 0.7 ? 6 : 4, dur: 12 + r() * 10, delay: -r() * 20, drift: (r() - 0.5) * 60 }));
})();

const mounted = () => true;
const noSubscribe = () => () => {};

// 홈 바탕 층의 눈. 페이지 바탕 위, 카드와 글자 아래로만 내린다(부모가 isolate라 음수 z가 바탕 바로 위에 깔린다).
// 눈이 내리는 동안 html에 data-snow를 붙여 홈의 다른 반복 움직임을 끈다. 동작 줄이기·차분한 화면이거나 메뉴에서 끄면 내리지 않는다
export function Snowfall({ slugs }: { slugs: string[] }) {
  const decor = useLiveDecor(slugs);
  const on = useSnowOn();
  const reduced = useReducedMotion();
  const client = useSyncExternalStore(noSubscribe, mounted, () => false);
  const falling = client && decor === "snow" && on && !reduced;
  useEffect(() => {
    if (!falling) return;
    document.documentElement.toggleAttribute("data-snow", true);
    return () => void document.documentElement.toggleAttribute("data-snow", false);
  }, [falling]);
  if (!falling) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className="snow-flake absolute top-0 block bg-fg/30 light:bg-line/70"
          style={{ left: `${f.left}%`, width: f.size, height: f.size, ["--snow-dur" as string]: `${f.dur}s`, ["--snow-delay" as string]: `${f.delay}s`, ["--snow-drift" as string]: `${f.drift}px` }}
        />
      ))}
    </div>
  );
}
