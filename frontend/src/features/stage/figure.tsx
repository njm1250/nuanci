"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Motion } from "@/features/scene/types";
import { targetPose } from "./pose";
import { C } from "./palette";
import { Box, Gem, Mat } from "./primitives";
import type { Look, Placement } from "./types";

export const HIP = { sit: 0.6, stand: 0.86 };
export const headTop = (p: Placement) => HIP[p.posture] + 1.28;

// 단순한 로우폴리 인물. 앉기·서기 자세와 반응 동작을 공통으로 처리한다
export function Figure({
  placement,
  look,
  motion,
  motionKey,
  talkKey,
  reduced,
}: {
  placement: Placement;
  look: Look;
  motion: Motion;
  motionKey: number;
  talkKey: number;
  reduced: boolean;
}) {
  const root = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const lArm = useRef<THREE.Group>(null!);
  const rArm = useRef<THREE.Group>(null!);
  const motionStart = useRef({ key: Number.NaN, at: 0 });
  const talkStart = useRef({ key: talkKey, at: -99 });
  const sit = placement.posture === "sit";
  const hip = HIP[placement.posture];

  useFrame((state, dt) => {
    const now = state.clock.elapsedTime;
    if (motionStart.current.key !== motionKey) motionStart.current = { key: motionKey, at: now };
    if (talkStart.current.key !== talkKey) talkStart.current = { key: talkKey, at: now };
    const p = targetPose(motion, reduced ? 99 : now - motionStart.current.at);
    if (!sit) {
      if (p.lArmX > -1) p.lArmX = -0.1;
      if (p.rArmX > -1) p.rArmX = -0.1;
    }
    const tt = now - talkStart.current.at;
    if (!reduced && tt < 1.1) {
      p.rArmX = -1.3 + Math.sin(tt * 12) * 0.18;
      p.headX += Math.sin(tt * 14) * 0.06;
    }
    const k = reduced ? 1 : 1 - Math.exp(-12 * dt);
    const to = (a: number, b: number) => a + (b - a) * k;
    root.current.position.y = to(root.current.position.y, p.rootY);
    torso.current.rotation.x = to(torso.current.rotation.x, p.torsoX);
    head.current.rotation.x = to(head.current.rotation.x, p.headX);
    head.current.rotation.y = to(head.current.rotation.y, p.headY);
    head.current.rotation.z = to(head.current.rotation.z, p.headZ);
    lArm.current.rotation.x = to(lArm.current.rotation.x, p.lArmX);
    lArm.current.rotation.z = to(lArm.current.rotation.z, p.lArmZ);
    rArm.current.rotation.x = to(rArm.current.rotation.x, p.rArmX);
    rArm.current.rotation.z = to(rArm.current.rotation.z, p.rArmZ);
  });

  const arm = (side: 1 | -1, ref: React.RefObject<THREE.Group>) => (
    <group ref={ref} position={[0.3 * side, 0.58, 0]}>
      <Box size={[0.13, 0.5, 0.13]} at={[0, -0.25, 0]} color={look.shirt} />
      <Box size={[0.11, 0.11, 0.11]} at={[0, -0.53, 0]} color={C.skin} />
    </group>
  );

  return (
    <group position={[placement.x, 0, placement.z ?? 0]} rotation={[0, placement.facing, 0]}>
      <group ref={root}>
        {sit ? (
          <>
            <Box size={[0.3, 0.14, 0.46]} at={[0, 0.55, 0.2]} color={C.ink} />
            <Box size={[0.28, 0.5, 0.14]} at={[0, 0.27, 0.42]} color={C.ink} />
            <Box size={[0.3, 0.07, 0.24]} at={[0, 0.035, 0.48]} color="#0d0d0c" />
          </>
        ) : (
          <>
            <Box size={[0.3, 0.86, 0.18]} at={[0, 0.43, 0]} color={C.ink} />
            <Box size={[0.32, 0.07, 0.3]} at={[0, 0.035, 0.06]} color="#0d0d0c" />
          </>
        )}
        <group ref={torso} position={[0, hip, 0]}>
          <mesh position={[0, 0.33, 0]}>
            <cylinderGeometry args={[0.27, 0.33, 0.66, 5]} />
            <Mat color={look.shirt} />
          </mesh>
          {look.apron && <Box size={[0.36, 0.5, 0.04]} at={[0, 0.22, 0.3]} color={look.apron} />}
          {arm(1, lArm)}
          {arm(-1, rArm)}
          <group ref={head} position={[0, 0.98, 0]}>
            <Gem r={0.29} at={[0, 0, 0]} color={C.skin} />
            {look.hairStyle === "curly" ? (
              <Gem r={0.36} at={[0, 0.12, -0.08]} color={look.hair} scale={[1.05, 0.85, 1]} />
            ) : (
              <Gem r={0.3} at={[0, 0.1, -0.06]} color={look.hair} scale={[1.08, 0.72, 1.06]} />
            )}
            {look.hairStyle === "bun" && (
              <mesh position={[0, 0.3, -0.16]}>
                <octahedronGeometry args={[0.12, 0]} />
                <Mat color={look.hair} />
              </mesh>
            )}
            {look.hairStyle === "cap" && <Box size={[0.5, 0.06, 0.62]} at={[0, 0.2, 0.06]} color={look.apron ?? C.ink} />}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[0.15 * s, 0.03, 0.23]}>
                <boxGeometry args={[0.05, 0.07, 0.05]} />
                <meshBasicMaterial color={C.ink} />
              </mesh>
            ))}
            {look.glasses && <Box size={[0.44, 0.03, 0.03]} at={[0, 0.06, 0.25]} color={C.ink} />}
          </group>
        </group>
      </group>
    </group>
  );
}
