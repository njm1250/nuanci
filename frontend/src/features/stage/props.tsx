"use client";

import { C } from "./palette";
import { Box, Cyl } from "./primitives";
import type { PropId } from "./types";

// 오른손에 드는 소품. 팔 기준 좌표라 손(아래쪽 끝)에 붙어서 팔과 함께 움직인다. 팔을 앞으로 뻗으면 -y가 앞쪽이 된다
export function HeldProp({ id }: { id: PropId }) {
  switch (id) {
    case "blaster":
      return (
        <>
          <Box size={[0.1, 0.34, 0.13]} at={[0, -0.7, 0.02]} color="#f08a24" />
          <Box size={[0.07, 0.07, 0.07]} at={[0, -0.9, 0.02]} color={C.teal} />
          <Box size={[0.08, 0.09, 0.17]} at={[0, -0.56, -0.1]} color="#f2d34a" />
        </>
      );
    case "phone":
      return (
        <>
          <Box size={[0.13, 0.22, 0.03]} at={[0, -0.62, 0.07]} color={C.ink} />
          <Box size={[0.1, 0.17, 0.005]} at={[0, -0.62, 0.087]} color="#9fd3e8" />
        </>
      );
    case "card":
      return <Box size={[0.17, 0.11, 0.015]} at={[0, -0.6, 0.08]} color={C.mustard} />;
    case "pudding":
      return (
        <>
          <Cyl r={[0.08, 0.06]} h={0.11} at={[0, -0.62, 0.09]} color={C.plate} />
          <Cyl r={0.075} h={0.03} at={[0, -0.555, 0.09]} color="#7a4a22" />
        </>
      );
    case "bag":
      return (
        <>
          <Box size={[0.02, 0.12, 0.02]} at={[0, -0.62, 0]} color={C.ink} />
          <Box size={[0.26, 0.28, 0.12]} at={[0, -0.82, 0]} color={C.mustard} />
        </>
      );
  }
}
