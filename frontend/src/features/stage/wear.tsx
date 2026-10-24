"use client";

import { C } from "./palette";
import { Box, Cyl, Gem } from "./primitives";
import type { Worn } from "./types";

const PINK = "#f08aa8";
const GOLD = "#e8b931";

// 머리에 쓰는 아이템. 머리 그룹 좌표 기준이라 고개를 돌리면 같이 움직인다
export function HeadWear({ wear }: { wear: Worn[] }) {
  return (
    <>
      {wear.map(({ id, color }) => {
        switch (id) {
          case "cap":
            return (
              <group key={id}>
                <Gem r={0.31} at={[0, 0.14, -0.02]} color={color ?? C.rust} scale={[1.08, 0.62, 1.08]} />
                <Box size={[0.36, 0.04, 0.26]} at={[0, 0.12, 0.3]} color={color ?? C.rust} />
              </group>
            );
          case "beanie":
            return (
              <group key={id}>
                <Gem r={0.32} at={[0, 0.15, -0.03]} color={color ?? C.navy} scale={[1.06, 0.7, 1.06]} />
                <Cyl r={0.3} h={0.07} at={[0, 0.07, -0.02]} color={color ?? C.navy} sides={8} />
                <Gem r={0.07} at={[0, 0.39, -0.03]} color={C.paper} />
              </group>
            );
          case "headphones":
            return (
              <group key={id}>
                <Box size={[0.66, 0.06, 0.1]} at={[0, 0.34, -0.02]} color={C.ink} />
                {[-1, 1].map((s) => (
                  <Box key={s} size={[0.1, 0.2, 0.18]} at={[0.31 * s, 0.02, 0]} color={color ?? C.teal} />
                ))}
              </group>
            );
          case "crown":
            return (
              <group key={id}>
                <Cyl r={0.2} h={0.1} at={[0, 0.34, 0]} color={GOLD} sides={8} />
                {[-1, 0, 1].map((s) => (
                  <Box key={s} size={[0.06, 0.1, 0.06]} at={[0.12 * s, 0.43, 0.12]} color={GOLD} />
                ))}
              </group>
            );
          case "cat-ears":
            return (
              <group key={id}>
                <Box size={[0.6, 0.04, 0.07]} at={[0, 0.3, 0.02]} color={color ?? C.ink} />
                {[-1, 1].map((s) => (
                  <group key={s} position={[0.18 * s, 0.4, 0.02]} rotation={[0, 0, -0.35 * s]}>
                    <Box size={[0.13, 0.15, 0.05]} at={[0, 0, 0]} color={color ?? C.ink} />
                    <Box size={[0.06, 0.08, 0.055]} at={[0, -0.01, 0.005]} color={color === PINK ? C.paper : PINK} />
                  </group>
                ))}
              </group>
            );
          case "flower":
            return (
              <group key={id} position={[0.24, 0.2, 0.1]}>
                {[
                  [0.05, 0],
                  [-0.05, 0],
                  [0, 0.05],
                  [0, -0.05],
                ].map(([x, y]) => (
                  <Box key={`${x}${y}`} size={[0.06, 0.06, 0.04]} at={[x, y, 0]} color={color ?? PINK} />
                ))}
                <Box size={[0.05, 0.05, 0.05]} at={[0, 0, 0.01]} color={color === GOLD ? C.paper : GOLD} />
              </group>
            );
          case "glasses":
            return (
              <group key={id}>
                {[-1, 1].map((s) => (
                  <Box key={s} size={[0.16, 0.13, 0.03]} at={[0.14 * s, 0.03, 0.27]} color={color ?? GOLD} />
                ))}
                {[-1, 1].map((s) => (
                  <Box key={`l${s}`} size={[0.1, 0.07, 0.035]} at={[0.14 * s, 0.03, 0.275]} color="#bfe3f2" />
                ))}
              </group>
            );
          case "sunglasses":
            return (
              <group key={id}>
                <Box size={[0.46, 0.03, 0.03]} at={[0, 0.07, 0.27]} color={C.ink} />
                {[-1, 1].map((s) => (
                  <Box key={s} size={[0.17, 0.11, 0.035]} at={[0.13 * s, 0.03, 0.275]} color="#111" />
                ))}
              </group>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

// 목에 하는 아이템. 몸통 그룹 좌표 기준이다
export function NeckWear({ wear }: { wear: Worn[] }) {
  return (
    <>
      {wear.map(({ id, color }) => {
        switch (id) {
          case "scarf":
            return (
              <group key={id}>
                <Cyl r={0.28} h={0.12} at={[0, 0.66, 0]} color={color ?? C.rust} sides={8} />
                <Box size={[0.1, 0.26, 0.05]} at={[0.1, 0.5, 0.28]} color={color ?? C.rust} rot={[-0.15, 0, 0]} />
              </group>
            );
          case "bowtie":
            return (
              <group key={id}>
                {[-1, 1].map((s) => (
                  <Box key={s} size={[0.1, 0.08, 0.03]} at={[0.07 * s, 0.6, 0.285]} color={color ?? C.rust} rot={[0, 0, 0.25 * s]} />
                ))}
                <Box size={[0.05, 0.05, 0.04]} at={[0, 0.6, 0.295]} color={color ?? C.rust} />
              </group>
            );
          case "badge":
            return (
              <group key={id}>
                {[-1, 1].map((s) => (
                  <Box key={s} size={[0.03, 0.32, 0.02]} at={[0.09 * s, 0.5, 0.28]} color={C.teal} rot={[-0.1, 0, -0.2 * s]} />
                ))}
                <Box size={[0.14, 0.18, 0.02]} at={[0, 0.32, 0.31]} color={C.paper} />
                <Box size={[0.14, 0.05, 0.025]} at={[0, 0.38, 0.31]} color={C.teal} />
              </group>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
