"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { C } from "./palette";
import type { PixelStage as PixelStageType } from "./pixel-stage";
import { SET_WALLS } from "./walls";

// three.js(약 250KB)는 첫 화면 묶음에서 빼서 글자와 버튼을 먼저 쓸 수 있게 한다. 홈처럼 무대가 꾸밈 역할인 화면에서 쓴다.
// 그리기 전까지 기다리지 않고 이 파일이 실행되자마자 받기 시작해서 무대가 늦게 뜨지 않게 한다
const load = () => import("./pixel-stage").then((m) => m.PixelStage);
if (typeof window !== "undefined") void load();
const PixelStage = dynamic(load, {
  ssr: false,
  loading: () => <div aria-hidden className="absolute inset-0 animate-pulse bg-white/10" />,
});

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
