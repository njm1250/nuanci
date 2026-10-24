"use client";

import { C } from "./palette";
import { Box, Cyl, Gem } from "./primitives";
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
    case "mic":
      return (
        <>
          <Cyl r={[0.035, 0.025]} h={0.2} at={[0, -0.66, 0.05]} color={C.ink} />
          <Gem r={0.065} at={[0, -0.8, 0.05]} color={C.metal} />
        </>
      );
    case "flowers":
      return (
        <>
          <Cyl r={[0.02, 0.05]} h={0.22} at={[0, -0.66, 0.05]} color={C.leaf} />
          <Gem r={0.07} at={[-0.06, -0.82, 0.05]} color="#f08aa8" />
          <Gem r={0.07} at={[0.06, -0.82, 0.05]} color={C.mustard} />
          <Gem r={0.07} at={[0, -0.88, 0.08]} color={C.rust} />
        </>
      );
    case "umbrella":
      return (
        <>
          <Box size={[0.03, 0.1, 0.03]} at={[0, -0.6, 0.04]} color={C.ink} />
          <Cyl r={[0.05, 0.02]} h={0.6} at={[0, -0.95, 0.04]} color={C.navy} sides={8} />
        </>
      );
    case "coffee":
      return (
        <>
          <Cyl r={[0.065, 0.05]} h={0.18} at={[0, -0.63, 0.09]} color={C.plate} />
          <Cyl r={0.063} h={0.06} at={[0, -0.63, 0.09]} color="#a8743f" />
          <Cyl r={0.07} h={0.025} at={[0, -0.535, 0.09]} color={C.ink} />
        </>
      );
    case "cake":
      return (
        <>
          <Box size={[0.22, 0.02, 0.18]} at={[0, -0.74, 0.1]} color={C.plate} />
          <Box size={[0.16, 0.1, 0.13]} at={[0, -0.68, 0.1]} color="#f6ead6" />
          <Box size={[0.165, 0.025, 0.135]} at={[0, -0.625, 0.1]} color="#f08aa8" />
          <Gem r={0.03} at={[0, -0.595, 0.1]} color="#d4265f" />
        </>
      );
    case "fish":
      return (
        <>
          <Box size={[0.05, 0.08, 0.05]} at={[0, -0.62, 0.02]} color="#5d7f9a" />
          <Box size={[0.1, 0.36, 0.14]} at={[0, -0.84, 0.02]} color="#7fa6c2" />
          <Box size={[0.11, 0.04, 0.05]} at={[0, -0.93, 0.07]} color={C.ink} />
        </>
      );
    case "gift":
      return (
        <>
          <Box size={[0.22, 0.2, 0.2]} at={[0, -0.72, 0.1]} color={C.rust} />
          <Box size={[0.23, 0.04, 0.21]} at={[0, -0.72, 0.1]} color={C.mustard} />
          <Box size={[0.04, 0.21, 0.21]} at={[0, -0.72, 0.1]} color={C.mustard} />
        </>
      );
    case "trophy":
      return (
        <>
          <Cyl r={[0.1, 0.05]} h={0.14} at={[0, -0.6, 0.1]} color="#e8b931" />
          <Cyl r={0.025} h={0.08} at={[0, -0.71, 0.1]} color="#e8b931" />
          <Box size={[0.14, 0.04, 0.1]} at={[0, -0.77, 0.1]} color={C.woodDark} />
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
