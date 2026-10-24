"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { C } from "./palette";
import type { PixelStage as PixelStageType } from "./pixel-stage";
import { SET_WALLS } from "./walls";

// three.js(약 250KB)는 첫 화면 묶음에서 빼서 글자와 버튼을 먼저 그리고 누를 수 있게 한다. 무대는 받는 대로 그 위에 덮는다
const load = () => import("./pixel-stage").then((m) => m.PixelStage);
const PixelStage = dynamic(load, {
  ssr: false,
  loading: () => <div aria-hidden className="absolute inset-0 animate-pulse bg-white/10" />,
});

// 무대가 화면의 중심인 장면 화면에서 모듈을 읽자마자 불러, 그리기 전부터 three.js를 받기 시작한다
export function preloadStage() {
  if (typeof window !== "undefined") void load();
}

// 무대를 불러오는 동안 같은 세트의 벽과 바닥만 있는 빈 무대를 스켈레톤처럼 보여주고, 다 불러오면 그 위에 덮는다
export function Stage(props: ComponentProps<typeof PixelStageType>) {
  const wall = SET_WALLS[props.spec.set][props.spec.time];
  return (
    <div className="absolute inset-0" style={{ background: wall }}>
      <div className="absolute inset-x-0 bottom-0 h-[18%]" style={{ background: C.floor }} />
      <PixelStage {...props} />
    </div>
  );
}
