import { EntryLink } from "@/features/scene/block-ui";
import { Arrow } from "@/features/scene/scene-parts";
import { SceneThumb } from "@/features/landing/scene-thumb";
import type { ShelfScene } from "@/features/landing/landing-progress";
import { LightString } from "./season-decor";

// 크리스마스 특집 전용 홈 배너. 다른 특집과 모양을 나누지 않는다(이번 한 번을 위한 화면).
// 밤하늘 딥 블루 면에 전구 줄·멈춘 눈·쌓인 눈을 두르고, 설명 대신 안에 든 장면 그림을 늘어놓아 빈 칸 없이 채운다
export function XmasBanner({ scenes, next, done, className = "" }: { scenes: ShelfScene[]; next: ShelfScene | null; done: number; className?: string }) {
  const target = next ?? scenes[0];
  // 큰 그림은 할 장면, 아래 작은 그림 둘은 그다음 장면들
  const shown = scenes.filter((s) => s.id !== target.id).slice(0, 2);
  return (
    <EntryLink href={`/scenes/${target.number}`} entry="home" className={`blk-btn block ${className}`}>
      <span className="blk relative block overflow-hidden bg-ink px-4 pb-6 pt-5 text-fg md:px-6 md:pb-8 md:pt-6">
        <LightString className="top-0" />
        <Flakes />
        <span className="relative grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-center md:gap-6">
          <span className="block">
            <span className="block text-meta text-fg-subtle">12월 31일까지 · 장면 {scenes.length}개{done > 0 && ` 중 ${done}개 해 봄`}</span>
            <span className="mt-1 block font-poster text-display-sm leading-tight md:text-display">크리스마스 특집</span>
            <span className="mt-3 flex items-center gap-2 text-ui font-bold">
              <span className="truncate">{done > 0 ? "이어서" : "첫 장면"}: {target.title}</span>
              <Arrow />
            </span>
          </span>
          {/* 모바일은 세 장을 한 줄로, 넓은 화면은 할 장면을 크게 두고 그다음 둘을 아래에 */}
          <span className="grid grid-cols-3 gap-2 md:grid-cols-2 md:gap-3">
            <SceneThumb stage={target.stage} className="aspect-[4/3] w-full border-2 border-fg md:col-span-2 md:aspect-[16/9]" />
            {shown.map((s) => (
              <SceneThumb key={s.id} stage={s.stage} className="aspect-[4/3] w-full border-2 border-fg/60" />
            ))}
          </span>
        </span>
        <SnowBank />
      </span>
    </EntryLink>
  );
}

// 배너 곳곳에 멈춰 있는 도트 눈송이. 홈 바탕의 내리는 눈과 겹치지 않게 움직이지 않는다
const FLAKES: [number, number, number][] = [
  [4, 22, 3], [11, 70, 2], [19, 40, 3], [27, 84, 2], [33, 18, 2], [41, 58, 3], [47, 30, 2],
  [53, 76, 2], [61, 14, 3], [68, 50, 2], [74, 88, 3], [81, 26, 2], [88, 64, 3], [95, 38, 2],
];
function Flakes() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" shapeRendering="crispEdges">
      {FLAKES.map(([x, y, s], i) => (
        <rect key={i} x={`${x}%`} y={`${y}%`} width={s} height={s} className="fill-white/70" />
      ))}
    </svg>
  );
}

// 아래 가장자리에 쌓인 눈
function SnowBank() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3 w-full" shapeRendering="crispEdges" preserveAspectRatio="none">
      <defs>
        <pattern id="xmas-snowbank" width="24" height="12" patternUnits="userSpaceOnUse">
          <rect x="0" y="6" width="24" height="6" className="fill-white" />
          <rect x="3" y="3" width="9" height="3" className="fill-white" />
          <rect x="15" y="4" width="5" height="2" className="fill-white" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#xmas-snowbank)" />
    </svg>
  );
}
