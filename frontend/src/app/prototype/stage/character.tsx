"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Expression, Motion } from "../scene";
import { getFaceTexture } from "./face";

export type Look = {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  hairStyle: "short" | "bun";
  apron?: string;
};

export type Pose = {
  rootY: number;
  torsoX: number;
  headX: number;
  headY: number;
  headZ: number;
  lArmX: number;
  lArmZ: number;
  rArmX: number;
  rArmZ: number;
};

export const REST: Pose = {
  rootY: 0,
  torsoX: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
  lArmX: -0.8,
  lArmZ: 0.1,
  rArmX: -0.8,
  rArmZ: -0.1,
};

// 반응 동작별로 시간 t(초)에 맞는 목표 자세를 계산한다
export function targetPose(motion: Motion, t: number): Pose {
  const p = { ...REST };
  const fade = (d: number) => Math.max(0, 1 - t / d);
  switch (motion) {
    case "nod":
      p.headX = Math.sin(t * 9) * 0.24 * fade(1.4);
      break;
    case "tilt":
      p.headZ = 0.34;
      p.headX = -0.06;
      p.rArmX = -1.9;
      p.rArmZ = 0.5;
      break;
    case "bounce":
      p.rootY = Math.abs(Math.sin(t * 8)) * 0.1 * fade(1.3);
      p.headX = -0.1;
      if (t < 1.3) {
        p.lArmX = -2.7;
        p.rArmX = -2.7;
        p.lArmZ = 0.35;
        p.rArmZ = -0.35;
      }
      break;
    case "shrug":
      p.lArmX = -0.5;
      p.rArmX = -0.5;
      p.lArmZ = 0.55;
      p.rArmZ = -0.55;
      p.headZ = 0.12;
      break;
    case "patBelly":
      p.torsoX = -0.12;
      p.headX = -0.14;
      p.rArmX = -0.45 + Math.sin(t * 7) * 0.12;
      p.rArmZ = 0.4;
      break;
    case "lean":
      p.torsoX = -0.18;
      p.headX = -0.08;
      p.headY = 0.3;
      p.lArmX = -1.4;
      p.lArmZ = 0.05;
      break;
    case "idle":
      break;
  }
  return p;
}

function Mat({ color }: { color: string }) {
  return <meshStandardMaterial color={color} flatShading roughness={0.9} />;
}

export function Character({
  position,
  rotationY,
  look,
  expression,
  motion,
  motionKey,
  talkKey = 0,
  reduced,
}: {
  position: [number, number, number];
  rotationY: number;
  look: Look;
  expression: Expression;
  motion: Motion;
  motionKey: number;
  talkKey?: number;
  reduced: boolean;
}) {
  const root = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const lArm = useRef<THREE.Group>(null!);
  const rArm = useRef<THREE.Group>(null!);
  const motionStart = useRef({ key: Number.NaN, at: 0 });
  const talkStart = useRef({ key: talkKey, at: -99 });
  const face = useMemo(() => getFaceTexture(expression), [expression]);

  useFrame((state, dt) => {
    const now = state.clock.elapsedTime;
    if (motionStart.current.key !== motionKey) {
      motionStart.current = { key: motionKey, at: now };
    }
    if (talkStart.current.key !== talkKey) {
      talkStart.current = { key: talkKey, at: now };
    }

    const p = targetPose(motion, reduced ? 99 : now - motionStart.current.at);
    const tt = now - talkStart.current.at;
    if (!reduced && tt < 1.1) {
      p.rArmX = -1.2 + Math.sin(tt * 12) * 0.16;
      p.rArmZ = 0.15;
      p.headX += Math.sin(tt * 14) * 0.05;
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
    torso.current.scale.y = reduced ? 1 : 1 + Math.sin(now * 2.2) * 0.012;
  });

  const arm = (side: 1 | -1, ref: React.RefObject<THREE.Group>) => (
    <group ref={ref} position={[0.37 * side, 0.6, 0]} rotation={[REST.lArmX, 0, 0.1 * side]}>
      <mesh position={[0, -0.25, 0]} castShadow>
        <boxGeometry args={[0.13, 0.5, 0.13]} />
        <Mat color={look.shirt} />
      </mesh>
      <mesh position={[0, -0.53, 0]} castShadow>
        <icosahedronGeometry args={[0.075, 0]} />
        <Mat color={look.skin} />
      </mesh>
    </group>
  );

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group ref={root}>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[0.12 * s, 0.55, 0.2]} castShadow>
              <boxGeometry args={[0.16, 0.14, 0.45]} />
              <Mat color={look.pants} />
            </mesh>
            <mesh position={[0.12 * s, 0.27, 0.42]} castShadow>
              <boxGeometry args={[0.15, 0.5, 0.15]} />
              <Mat color={look.pants} />
            </mesh>
            <mesh position={[0.12 * s, 0.04, 0.48]} castShadow>
              <boxGeometry args={[0.17, 0.08, 0.24]} />
              <Mat color="#3a3330" />
            </mesh>
          </group>
        ))}

        <group ref={torso} position={[0, 0.6, 0]}>
          <mesh position={[0, 0.33, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.36, 0.66, 6]} />
            <Mat color={look.shirt} />
          </mesh>
          {look.apron && (
            <mesh position={[0, 0.24, 0.33]} castShadow>
              <boxGeometry args={[0.4, 0.46, 0.03]} />
              <Mat color={look.apron} />
            </mesh>
          )}
          {arm(1, lArm)}
          {arm(-1, rArm)}
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.09, 0.1, 0.14, 6]} />
            <Mat color={look.skin} />
          </mesh>

          <group ref={head} position={[0, 0.98, 0]}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.3, 1]} />
              <Mat color={look.skin} />
            </mesh>
            <mesh position={[0, -0.02, 0.305]}>
              <planeGeometry args={[0.42, 0.42]} />
              <meshBasicMaterial map={face} transparent depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.12, -0.05]} scale={[1.05, 0.75, 1.05]} castShadow>
              <icosahedronGeometry args={[0.32, 0]} />
              <Mat color={look.hair} />
            </mesh>
            {look.hairStyle === "bun" && (
              <mesh position={[0, 0.34, -0.14]} castShadow>
                <icosahedronGeometry args={[0.13, 0]} />
                <Mat color={look.hair} />
              </mesh>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}
