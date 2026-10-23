"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Expression, Motion } from "../scene";
import { REST, targetPose } from "../stage/character";

export const PALETTE = {
  ink: "#1b1b1a",
  wall: "#c7ced1",
  wallLate: "#8f9aa6",
  floor: "#5e5a54",
  wood: "#9c4f2c",
  woodDark: "#7a3c21",
  plate: "#f3f1ea",
  skin: "#e6bf98",
  me: "#2d4a73",
  partner: "#e1ad34",
  pants: "#2b2b2b",
  leaf: "#4f7a4a",
  sky: "#e9eef0",
  night: "#28304a",
};

type Look = { shirt: string; hair: string; bun?: boolean };

function Mat({ color }: { color: string }) {
  return <meshLambertMaterial color={color} flatShading />;
}

function Box({ size, position, color }: { size: [number, number, number]; position: [number, number, number]; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <Mat color={color} />
    </mesh>
  );
}

// 옆에서 본 단순한 로우폴리 인물. 얼굴은 눈 점 하나, 감정은 머리 위 기호로 표현한다
function Figure({
  x,
  facing,
  look,
  motion,
  motionKey,
  talkKey,
  reduced,
}: {
  x: number;
  facing: 1 | -1;
  look: Look;
  motion: Motion;
  motionKey: number;
  talkKey: number;
  reduced: boolean;
}) {
  const root = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const arm = useRef<THREE.Group>(null!);
  const motionStart = useRef({ key: Number.NaN, at: 0 });
  const talkStart = useRef({ key: talkKey, at: -99 });

  useFrame((state, dt) => {
    const now = state.clock.elapsedTime;
    if (motionStart.current.key !== motionKey) motionStart.current = { key: motionKey, at: now };
    if (talkStart.current.key !== talkKey) talkStart.current = { key: talkKey, at: now };
    const p = targetPose(motion, reduced ? 99 : now - motionStart.current.at);
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
    head.current.rotation.z = to(head.current.rotation.z, p.headZ);
    arm.current.rotation.x = to(arm.current.rotation.x, Math.min(p.rArmX, p.lArmX));
  });

  return (
    <group position={[x, 0, 0]} rotation={[0, (facing * Math.PI) / 2, 0]}>
      <group ref={root}>
        <Box size={[0.3, 0.14, 0.46]} position={[0, 0.55, 0.2]} color={PALETTE.pants} />
        <Box size={[0.28, 0.5, 0.14]} position={[0, 0.27, 0.42]} color={PALETTE.pants} />
        <Box size={[0.3, 0.07, 0.24]} position={[0, 0.035, 0.48]} color={PALETTE.ink} />
        <group ref={torso} position={[0, 0.6, 0]}>
          <mesh position={[0, 0.33, 0]}>
            <cylinderGeometry args={[0.27, 0.33, 0.66, 5]} />
            <Mat color={look.shirt} />
          </mesh>
          <group ref={arm} position={[0, 0.58, 0]} rotation={[REST.rArmX, 0, 0]}>
            <mesh position={[0, -0.25, 0]}>
              <boxGeometry args={[0.14, 0.5, 0.14]} />
              <Mat color={look.shirt} />
            </mesh>
            <mesh position={[0, -0.53, 0]}>
              <boxGeometry args={[0.12, 0.12, 0.12]} />
              <Mat color={PALETTE.skin} />
            </mesh>
          </group>
          <group ref={head} position={[0, 0.98, 0]}>
            <mesh>
              <icosahedronGeometry args={[0.29, 0]} />
              <Mat color={PALETTE.skin} />
            </mesh>
            <mesh position={[0, 0.1, -0.06]} scale={[1.08, 0.72, 1.06]}>
              <icosahedronGeometry args={[0.3, 0]} />
              <Mat color={look.hair} />
            </mesh>
            {look.bun && (
              <mesh position={[0, 0.3, -0.16]}>
                <octahedronGeometry args={[0.12, 0]} />
                <Mat color={look.hair} />
              </mesh>
            )}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[0.15 * s, 0.03, 0.22]}>
                <boxGeometry args={[0.05, 0.07, 0.05]} />
                <meshBasicMaterial color={PALETTE.ink} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}

function Room({ later, container }: { later: boolean; container: boolean }) {
  return (
    <group>
      <mesh position={[0, 1.5, -1.2]}>
        <planeGeometry args={[30, 6]} />
        <meshBasicMaterial color={later ? PALETTE.wallLate : PALETTE.wall} />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[30, 3, 2.4]} />
        <meshBasicMaterial color={PALETTE.floor} />
      </mesh>

      <mesh position={[-1.9, 1.95, -1.15]}>
        <planeGeometry args={[1.1, 0.8]} />
        <meshBasicMaterial color={later ? PALETTE.night : PALETTE.sky} />
      </mesh>
      <mesh position={[-1.9, 1.95, -1.14]}>
        <planeGeometry args={[0.04, 0.8]} />
        <meshBasicMaterial color={PALETTE.ink} />
      </mesh>
      <mesh position={[2.05, 1.8, -1.15]}>
        <planeGeometry args={[0.5, 0.65]} />
        <meshBasicMaterial color={PALETTE.leaf} />
      </mesh>

      <mesh position={[0, 2.75, 0]}>
        <boxGeometry args={[0.015, 0.7, 0.015]} />
        <meshBasicMaterial color={PALETTE.ink} />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <coneGeometry args={[0.26, 0.22, 6]} />
        <Mat color={PALETTE.ink} />
      </mesh>
      <mesh position={[0, 2.17, 0]}>
        <boxGeometry args={[0.1, 0.06, 0.1]} />
        <meshBasicMaterial color={later ? "#ffd27a" : "#efe6cf"} />
      </mesh>

      <Box size={[1.7, 0.08, 1.0]} position={[0, 0.78, 0]} color={PALETTE.wood} />
      {[-0.76, 0.76].map((x) => (
        <Box key={x} size={[0.08, 0.74, 0.08]} position={[x, 0.37, 0.4]} color={PALETTE.woodDark} />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[0.5, 0.06, 0.5]} position={[1.15 * s, 0.5, 0]} color={PALETTE.woodDark} />
          <Box size={[0.06, 0.72, 0.5]} position={[1.43 * s, 0.86, 0]} color={PALETTE.woodDark} />
          <Box size={[0.06, 0.5, 0.06]} position={[1.15 * s - 0.2 * s, 0.25, 0.2]} color={PALETTE.woodDark} />
        </group>
      ))}

      {[
        { x: -0.48, full: true },
        { x: 0.48, full: !later },
      ].map(({ x, full }) => (
        <group key={x} position={[x, 0.83, 0.1]}>
          <Box size={[0.42, 0.03, 0.42]} position={[0, 0, 0]} color={PALETTE.plate} />
          {full && (
            <mesh position={[0, 0.07, 0]}>
              <icosahedronGeometry args={[0.1, 0]} />
              <Mat color="#c96b3c" />
            </mesh>
          )}
        </group>
      ))}
      <mesh position={[0, 0.92, -0.2]}>
        <cylinderGeometry args={[0.2, 0.16, 0.2, 6]} />
        <Mat color={PALETTE.ink} />
      </mesh>
      <mesh position={[0, 1.04, -0.2]}>
        <icosahedronGeometry args={[0.13, 0]} />
        <Mat color="#d98a3a" />
      </mesh>
      {container && <Box size={[0.3, 0.14, 0.22]} position={[0.42, 0.9, 0.35]} color={PALETTE.plate} />}
    </group>
  );
}

const ANCHORS = {
  me: new THREE.Vector3(-1.2, 2.1, 0),
  partner: new THREE.Vector3(1.2, 2.1, 0),
};

function Fit() {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const camera = get().camera;
    camera.zoom = Math.min(size.width / 5.6, size.height / 3.1);
    camera.lookAt(0, 1.15, 0);
    camera.updateProjectionMatrix();
  }, [get, size]);
  return null;
}

// 캐릭터 머리 위 3D 좌표를 화면 좌표로 바꿔 말풍선·기호 위치를 맞춘다
function Anchors({ els }: { els: React.RefObject<Record<"me" | "partner", HTMLDivElement | null>> }) {
  const v = useRef(new THREE.Vector3());
  useFrame((state) => {
    const { width, height } = state.size;
    for (const key of ["me", "partner"] as const) {
      const el = els.current[key];
      if (!el) continue;
      const p = v.current.copy(ANCHORS[key]).project(state.camera);
      el.style.setProperty("transform", `translate(${(p.x * 0.5 + 0.5) * width}px, ${(-p.y * 0.5 + 0.5) * height}px)`);
    }
  });
  return null;
}

const SYMBOLS: Partial<Record<Expression, React.ReactNode>> = {
  puzzled: <span className="text-[30px] font-bold leading-none">?</span>,
  delighted: <span className="text-[30px] font-bold leading-none">!</span>,
  happy: (
    <svg width="34" height="22" viewBox="0 0 34 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
      <path d="M4 16 L9 6 M17 14 L17 2 M30 16 L25 6" />
    </svg>
  ),
  awkward: (
    <svg width="18" height="26" viewBox="0 0 18 26">
      <path d="M9 2 C13 10 16 14 16 18 A7 7 0 0 1 2 18 C2 14 5 10 9 2Z" fill="#7fb4d8" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
};

export function FlatStage({
  pixel,
  later,
  partnerMotion,
  partnerKey,
  talkKey,
  reaction,
  meLine,
  partnerLine,
  container,
  reduced,
}: {
  pixel: boolean;
  later: boolean;
  partnerMotion: Motion;
  partnerKey: number;
  talkKey: number;
  reaction: Expression | null;
  meLine?: string;
  partnerLine?: string;
  container: boolean;
  reduced: boolean;
}) {
  const els = useRef<Record<"me" | "partner", HTMLDivElement | null>>({ me: null, partner: null });
  const symbol = reaction ? SYMBOLS[reaction] : null;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: later ? PALETTE.wallLate : PALETTE.wall }}>
      <Canvas
        key={pixel ? "pixel" : "sharp"}
        orthographic
        dpr={pixel ? 0.3 : [1, 2]}
        camera={{ position: [0, 1.6, 10], zoom: 70, near: 0.1, far: 50 }}
        gl={{ antialias: !pixel }}
        style={{ imageRendering: pixel ? "pixelated" : "auto" }}
      >
        <Fit />
        <Anchors els={els} />
        <ambientLight intensity={later ? 1.7 : 2.1} />
        <directionalLight position={[-3, 4, 6]} intensity={later ? 0.9 : 1.2} />
        <Room later={later} container={container} />
        <Figure x={-1.15} facing={1} look={{ shirt: PALETTE.me, hair: PALETTE.ink }} motion="idle" motionKey={0} talkKey={talkKey} reduced={reduced} />
        <Figure
          x={1.15}
          facing={-1}
          look={{ shirt: PALETTE.partner, hair: "#4a2e1f", bun: true }}
          motion={partnerMotion}
          motionKey={partnerKey}
          talkKey={0}
          reduced={reduced}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 text-[#1b1b1a]">
        {meLine && <Speech text={meLine} side="me" />}
        {!symbol && partnerLine && <Speech text={partnerLine} side="partner" />}
        <div ref={(el) => void (els.current.partner = el)} className="absolute left-0 top-0">
          {symbol && (
            <div key={`${reaction}-${partnerKey}`} className="absolute bottom-1 left-0 -translate-x-1/2 animate-[pop_260ms_ease-out]">
              {symbol}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Speech({ text, side }: { text: string; side: "me" | "partner" }) {
  const pos = side === "me" ? "left-3" : "right-3";
  const tail = side === "me" ? "left-10" : "right-10";
  return (
    <div
      key={text}
      className={`absolute top-3 ${pos} max-w-[48%] animate-[fade-in_180ms] border-2 border-[#1b1b1a] bg-white px-2.5 py-1.5 text-[13px] leading-snug break-keep`}
    >
      {text}
      <span className={`absolute -bottom-[7px] ${tail} size-3 rotate-45 border-b-2 border-r-2 border-[#1b1b1a] bg-white`} />
    </div>
  );
}
