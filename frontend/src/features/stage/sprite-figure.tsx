"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Expression, Motion } from "@/features/scene/types";
import { headTop, resolveExpression } from "./figure";
import { SPRITE_H, SPRITE_PPU, SPRITE_W, spriteTexture } from "./sprite";
import type { Look, Placement } from "./types";

// 2D 픽셀 그림 인물. 움직임도 도트답게 칸 단위로 끊어서 준다
// - 가만히: 0.6초마다 1칸 숨쉬기
// - 신남(bounce·clap·dance 등): 두 칸 콩콩
// - 놀람·패닉: 잠깐 좌우로 1칸 떨기, 기절·털썩: 옆으로 눕기
const PX = 1 / SPRITE_PPU;
const HOP: Motion[] = ["bounce", "clap", "dance", "spin", "wave"];
const SHAKE: Motion[] = ["panic", "shiver"];
const FALL: Motion[] = ["faint", "flop"];

export function SpriteFigure({
  placement,
  look,
  motion,
  motionKey,
  reduced,
  expression,
}: {
  placement: Placement;
  look: Look;
  motion: Motion;
  motionKey: number;
  reduced: boolean;
  expression?: Expression | null;
}) {
  const sitting = placement.posture === "sit";
  const face = resolveExpression(expression, motion);
  const texture = useMemo(() => spriteTexture(face, sitting), [face, sitting]);
  const w = SPRITE_W * PX;
  const h = SPRITE_H * PX;
  // 말풍선 높이(headTop)에 그림 꼭대기를 맞춘다. 앉으면 다리를 빼고 그려서 탁자 뒤에 앉은 것처럼 보인다
  const top = headTop(placement, look);
  const z = (placement.z ?? 0) + (sitting ? 0.26 : 0.08);
  const body = useRef<THREE.Mesh>(null!);
  const started = useRef({ key: Number.NaN, at: 0 });

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (started.current.key !== motionKey) started.current = { key: motionKey, at: t };
    const mt = t - started.current.at;
    let x = 0;
    let y = 0;
    let rot = 0;
    if (!reduced) {
      y = Math.floor(t / 0.6) % 2 ? PX : 0;
      if (HOP.includes(motion) && mt < 1.6) y = (Math.floor(mt / 0.13) % 2 ? 2 : 0) * PX;
      if ((SHAKE.includes(motion) || face === "shocked") && mt < 0.6) x = (Math.floor(mt / 0.05) % 2 ? 1 : -1) * PX;
    }
    if (FALL.includes(motion)) rot = (placement.facing >= 0 ? 1 : -1) * Math.PI / 2;
    body.current.position.set(placement.x + x, top - h / 2 + y, z);
    body.current.rotation.z = rot;
  });

  return (
    <mesh ref={body} position={[placement.x, top - h / 2, z]} scale={[placement.facing >= 0 ? 1 : -1, 1, 1]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.5} toneMapped={false} />
    </mesh>
  );
}
