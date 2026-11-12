"use client";

import { useLayoutEffect, useRef, useState } from "react";

// 무대 생각 풍선의 몸통. 풍선 크기를 재서 도트 구름(위·아래 가장자리에 혹) 하나를 SVG 경로로 통째로 그린다.
// 가장자리 그림을 이어 붙이면 화면 배율·확대에 따라 이음매 선이 비쳐서, 이어 붙일 곳이 없게 한 장으로 그린다
const DOT = 2; // 도트 한 칸 = 2px
const PERIOD = 8; // 구름 혹 하나의 폭(도트)
const BUMP = [2, 1, 0, 0, 0, 0, 1, 2]; // 혹 안에서 위 가장자리가 내려오는 깊이
const CORNER = [3, 2, 1, 1]; // 모서리를 둥글게 깎는 깊이(옆에서부터)

function shape(w: number, h: number) {
  const W = Math.floor(w / DOT);
  const H = Math.floor(h / DOT);
  const phase = Math.floor((W % PERIOD) / 2);
  const top = (x: number) => {
    const fromSide = Math.min(x, W - 1 - x);
    return Math.max(BUMP[(((x - phase) % PERIOD) + PERIOD) % PERIOD], fromSide < CORNER.length ? CORNER[fromSide] : 0);
  };
  const inside = (x: number, y: number) => x >= 0 && x < W && y >= top(x) && y <= H - 1 - top(x);
  let fill = "";
  let line = "";
  for (let y = 0; y < H; y++) {
    // 같은 줄에서 이어진 칸은 한 사각형으로 묶어 경로를 짧게 한다
    let run: { kind: "f" | "o"; x: number } | null = null;
    const flush = (end: number) => {
      if (!run) return;
      const d = `M${run.x * DOT} ${y * DOT}h${(end - run.x) * DOT}v${DOT}h${-(end - run.x) * DOT}z`;
      if (run.kind === "f") fill += d;
      else line += d;
      run = null;
    };
    for (let x = 0; x <= W; x++) {
      const kind = !inside(x, y) ? null : inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1) ? "f" : "o";
      if (run && run.kind !== kind) flush(x);
      if (kind && !run) run = { kind, x };
    }
  }
  return { fill, line };
}

export function ThinkCloud({ className = "", children, ref }: { className?: string; children: React.ReactNode; ref?: (el: HTMLDivElement | null) => void }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    // offsetWidth는 확대(transform) 전 크기라 데스크톱에서 풍선을 키워도 같은 도트 수로 그린다
    const measure = () => setSize((s) => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { fill, line } = shape(size.w, size.h);
  return (
    <div
      ref={(el) => {
        box.current = el;
        ref?.(el);
      }}
      className={`isolate ${className}`}
    >
      <svg aria-hidden width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} shapeRendering="crispEdges" className="absolute left-0 top-0 -z-10">
        <path d={fill} fill="var(--blue-100)" />
        <path d={line} fill="var(--color-ink-fixed)" />
      </svg>
      {children}
    </div>
  );
}
