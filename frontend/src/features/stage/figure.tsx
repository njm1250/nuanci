"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Motion } from "@/features/scene/types";
import { targetPose } from "./pose";
import { C } from "./palette";
import { Box, Gem, Mat } from "./primitives";
import { HeldProp } from "./props";
import { HeadWear, NeckWear } from "./wear";
import type { Look, Placement, PropId } from "./types";

export const HIP = { sit: 0.6, stand: 0.86 };
// 동물 캐릭터는 머리가 크고 귀가 솟아 있어서 말풍선을 조금 더 위에 띄운다
const HEAD_SCALE = 1.25;
export const headTop = (p: Placement, look?: Look) => HIP[p.posture] + (look?.animal ? 1.48 : 1.28);

// 단순한 로우폴리 인물. 앉기·서기 자세와 반응 동작을 공통으로 처리한다
export function Figure({
  placement,
  look,
  motion,
  motionKey,
  talkKey,
  reduced,
  prop,
}: {
  placement: Placement;
  look: Look;
  motion: Motion;
  motionKey: number;
  talkKey: number;
  reduced: boolean;
  prop?: PropId;
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
  const animal = look.animal;
  const skin = animal?.fur ?? C.skin;

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
    // 따로 정한 동작이 있으면 말할 때 손짓으로 덮어쓰지 않는다
    if (!reduced && tt < 1.1 && motion === "idle") {
      p.rArmX = -1.3 + Math.sin(tt * 12) * 0.18;
      p.headX += Math.sin(tt * 14) * 0.06;
    }
    const k = reduced ? 1 : 1 - Math.exp(-12 * dt);
    const to = (a: number, b: number) => a + (b - a) * k;
    // 한 바퀴 돈 뒤 다음 동작에서 거꾸로 감기지 않게 각도를 한 바퀴만큼 되돌린다
    if (Math.abs(root.current.rotation.y - p.rootSpin) > Math.PI) root.current.rotation.y -= Math.sign(root.current.rotation.y - p.rootSpin) * Math.PI * 2;
    root.current.position.x = to(root.current.position.x, p.rootX);
    root.current.position.y = to(root.current.position.y, p.rootY);
    root.current.rotation.y = to(root.current.rotation.y, p.rootSpin);
    // 쓰러질 때는 상대 반대쪽으로 넘어진다. 앉아 있으면 엉덩이를 축으로 상체만 옆으로 쓰러진다
    const tilt = p.rootTilt * (placement.x > 0 ? -1 : 1);
    root.current.rotation.z = to(root.current.rotation.z, sit ? 0 : tilt);
    torso.current.rotation.z = to(torso.current.rotation.z, sit ? tilt * 0.8 : 0);
    torso.current.rotation.x = to(torso.current.rotation.x, p.torsoX);
    head.current.rotation.x = to(head.current.rotation.x, p.headX);
    // 동물 캐릭터는 얼굴이 보이게 고개를 관객 쪽으로 반쯤 돌리고 있다
    head.current.rotation.y = to(head.current.rotation.y, p.headY - (animal ? placement.facing * 0.55 : 0));
    head.current.rotation.z = to(head.current.rotation.z, p.headZ);
    lArm.current.rotation.x = to(lArm.current.rotation.x, p.lArmX);
    lArm.current.rotation.z = to(lArm.current.rotation.z, p.lArmZ);
    rArm.current.rotation.x = to(rArm.current.rotation.x, p.rArmX);
    rArm.current.rotation.z = to(rArm.current.rotation.z, p.rArmZ);
  });

  const arm = (side: 1 | -1, ref: React.RefObject<THREE.Group>) => (
    <group ref={ref} position={[0.3 * side, 0.58, 0]}>
      <Box size={[0.13, 0.5, 0.13]} at={[0, -0.25, 0]} color={look.shirt} />
      <Box size={[0.11, 0.11, 0.11]} at={[0, -0.53, 0]} color={skin} />
      {side === -1 && prop && <HeldProp id={prop} />}
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
          {look.tie && <Box size={[0.08, 0.42, 0.03]} at={[0, 0.38, 0.29]} color={look.tie} rot={[-0.15, 0, 0]} />}
          {look.wear && <NeckWear wear={look.wear} />}
          {arm(1, lArm)}
          {arm(-1, rArm)}
          {animal?.kind === "cat" && <Box size={[0.07, 0.07, 0.42]} at={[0, 0.12, -0.42]} color={animal.fur} rot={[-0.7, 0, 0]} />}
          {animal?.kind === "bear" && <Gem r={0.08} at={[0, 0.1, -0.33]} color={animal.fur} />}
          {animal?.kind === "dog" && <Box size={[0.06, 0.22, 0.06]} at={[0, 0.2, -0.34]} color={animal.inner} rot={[-0.5, 0, 0]} />}
          <group ref={head} position={[0, animal ? 1.02 : 0.98, 0]} scale={animal ? HEAD_SCALE : 1}>
            <Gem r={0.29} at={[0, 0, 0]} color={skin} />
            {animal?.kind === "cat" &&
              [-1, 1].map((s) => (
                <group key={s} position={[0.17 * s, 0.27, 0]} rotation={[0, 0, -0.3 * s]}>
                  <mesh>
                    <coneGeometry args={[0.12, 0.24, 4]} />
                    <Mat color={animal.fur} />
                  </mesh>
                  <mesh position={[0, -0.03, 0.05]} scale={[0.55, 0.65, 0.4]}>
                    <coneGeometry args={[0.12, 0.24, 4]} />
                    <Mat color={animal.inner} />
                  </mesh>
                </group>
              ))}
            {animal?.kind === "bear" && (
              <>
                {[-1, 1].map((s) => (
                  <Gem key={s} r={0.11} at={[0.22 * s, 0.24, -0.02]} color={animal.fur} />
                ))}
                <Gem r={0.11} at={[0, -0.08, 0.22]} color={animal.inner} scale={[1, 0.7, 0.6]} />
              </>
            )}
            {animal?.kind === "dog" && (
              <>
                {[-1, 1].map((s) => (
                  <Box key={s} size={[0.1, 0.26, 0.08]} at={[0.29 * s, 0.02, -0.02]} color={animal.inner} rot={[0, 0, 0.25 * s]} />
                ))}
                <Gem r={0.11} at={[0, -0.08, 0.22]} color="#f6ead6" scale={[1, 0.7, 0.6]} />
                <Box size={[0.07, 0.05, 0.04]} at={[0, -0.04, 0.3]} color={C.ink} />
              </>
            )}
            {animal &&
              [-1, 1].map((s) => (
                <mesh key={s} position={[0.19 * s, -0.07, 0.21]}>
                  <boxGeometry args={[0.07, 0.035, 0.03]} />
                  <meshBasicMaterial color="#f28fa5" />
                </mesh>
              ))}
            {look.hairStyle === "curly" ? (
              <Gem r={0.36} at={[0, 0.12, -0.08]} color={look.hair} scale={[1.05, 0.85, 1]} />
            ) : look.hairStyle === "none" ? null : (
              <Gem r={0.3} at={[0, 0.1, -0.06]} color={look.hair} scale={[1.08, 0.72, 1.06]} />
            )}
            {look.hairStyle === "long" && <Box size={[0.52, 0.5, 0.2]} at={[0, -0.16, -0.17]} color={look.hair} />}
            {look.hairStyle === "bun" && (
              <mesh position={[0, 0.3, -0.16]}>
                <octahedronGeometry args={[0.12, 0]} />
                <Mat color={look.hair} />
              </mesh>
            )}
            {look.hairStyle === "cap" && <Box size={[0.5, 0.06, 0.62]} at={[0, 0.2, 0.06]} color={look.apron ?? C.ink} />}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[0.15 * s, 0.03, 0.23]}>
                <boxGeometry args={animal ? [0.07, 0.1, 0.06] : [0.05, 0.07, 0.05]} />
                <meshBasicMaterial color={C.ink} />
              </mesh>
            ))}
            {look.glasses && <Box size={[0.44, 0.03, 0.03]} at={[0, 0.06, 0.25]} color={C.ink} />}
            {look.wear && <HeadWear wear={look.wear} />}
          </group>
        </group>
      </group>
    </group>
  );
}
