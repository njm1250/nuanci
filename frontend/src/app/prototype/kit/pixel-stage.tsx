"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Expression, Motion } from "../scene";
import { CAST } from "./cast";
import { Figure, headTop } from "./figure";
import { C } from "./palette";
import { REACTION_SYMBOLS } from "./reactions";
import { SETS } from "./sets";
import type { StageSpec } from "./types";

// 화면 크기와 상관없이 가로 픽셀 수를 고정해서 어떤 크기에서도 같은 도트 밀도로 보이게 한다
const PIXELS_WIDE = 200;

function Rig({ pixel }: { pixel: boolean }) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const setDpr = useThree((s) => s.setDpr);
  useEffect(() => {
    setDpr(pixel ? PIXELS_WIDE / size.width : Math.min(window.devicePixelRatio, 2));
    const camera = get().camera;
    camera.zoom = Math.min(size.width / 5.6, size.height / 3.85);
    camera.lookAt(0, 1.15, 0);
    camera.updateProjectionMatrix();
  }, [get, size, setDpr, pixel]);
  return null;
}

function Anchor({ target, el }: { target: THREE.Vector3; el: React.RefObject<HTMLDivElement | null> }) {
  const v = useRef(new THREE.Vector3());
  useFrame((state) => {
    if (!el.current) return;
    const { width, height } = state.size;
    const p = v.current.copy(target).project(state.camera);
    el.current.style.setProperty("transform", `translate(${(p.x * 0.5 + 0.5) * width}px, ${(-p.y * 0.5 + 0.5) * height}px)`);
  });
  return null;
}

function Speech({ text, side }: { text: string; side: "me" | "partner" }) {
  return (
    <div
      key={text}
      className={`absolute top-2.5 ${side === "me" ? "left-2.5" : "right-2.5"} max-w-[50%] animate-[fade-in_180ms] border-2 border-[#1b1b1a] bg-white px-2 py-1 text-[13px] leading-snug break-keep`}
    >
      {text}
      <span className={`absolute -bottom-[7px] ${side === "me" ? "left-8" : "right-8"} size-3 rotate-45 border-b-2 border-r-2 border-[#1b1b1a] bg-white`} />
    </div>
  );
}

export type StageState = {
  partnerMotion: Motion;
  partnerKey: number;
  talkKey: number;
  reaction: Expression | null;
  meLine?: string;
  partnerLine?: string;
};

export function PixelStage({
  spec,
  state,
  reduced = false,
  pixel = true,
}: {
  spec: StageSpec;
  state?: StageState;
  reduced?: boolean;
  pixel?: boolean;
}) {
  const set = SETS[spec.set];
  const evening = spec.time === "evening";
  const flags = useMemo(() => new Set(spec.flags), [spec.flags]);
  const anchor = useMemo(() => new THREE.Vector3(set.partner.x, headTop(set.partner) + 0.22, set.partner.z ?? 0), [set]);
  const symbolEl = useRef<HTMLDivElement>(null);
  const wall = set.wall[spec.time];
  const symbol = state?.reaction ? REACTION_SYMBOLS[state.reaction] : null;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: wall }}>
      <Canvas
        orthographic
        dpr={pixel ? 0.5 : [1, 2]}
        camera={{ position: [0, 1.6, 10], zoom: 70, near: 0.1, far: 50 }}
        gl={{ antialias: !pixel }}
        style={{ imageRendering: pixel ? "pixelated" : "auto" }}
      >
        <Rig pixel={pixel} />
        {state && <Anchor target={anchor} el={symbolEl} />}
        <ambientLight intensity={evening ? 1.7 : 2.1} />
        <directionalLight position={[-3, 4, 6]} intensity={evening ? 0.9 : 1.2} />

        <Flat wall={wall} />
        <set.Scenery evening={evening} flags={flags} />
        <Figure
          placement={set.me}
          look={CAST.me}
          motion="idle"
          motionKey={0}
          talkKey={state?.talkKey ?? 0}
          reduced={reduced}
        />
        <Figure
          placement={set.partner}
          look={CAST[spec.partner]}
          motion={state?.partnerMotion ?? "idle"}
          motionKey={state?.partnerKey ?? 0}
          talkKey={0}
          reduced={reduced}
        />
      </Canvas>

      {state && (
        <div className="pointer-events-none absolute inset-0 text-[#1b1b1a]">
          {state.meLine && <Speech text={state.meLine} side="me" />}
          {!symbol && state.partnerLine && <Speech text={state.partnerLine} side="partner" />}
          <div ref={symbolEl} className={`absolute left-0 top-0 ${evening && spec.set === "street" ? "text-[#f2f0eb]" : ""}`}>
            {symbol && (
              <div key={`${state.reaction}-${state.partnerKey}`} className="absolute bottom-0 left-0 -translate-x-1/2 animate-[pop_260ms_ease-out]">
                {symbol}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Flat({ wall }: { wall: string }) {
  return (
    <>
      <mesh position={[0, 1.5, -1.2]}>
        <planeGeometry args={[30, 6]} />
        <meshBasicMaterial color={wall} />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[30, 3, 2.4]} />
        <meshBasicMaterial color={C.floor} />
      </mesh>
    </>
  );
}
