"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Expression, Motion } from "@/features/scene/types";
import { CAST } from "./cast";
import { Figure, headTop } from "./figure";
import { C } from "./palette";
import { REACTION_SYMBOLS } from "./reactions";
import { SETS } from "./sets";
import type { StageSpec } from "./types";

// 화면 크기와 상관없이 가로 픽셀 수를 고정해서 어떤 크기에서도 같은 도트 밀도로 보이게 한다
const PIXELS_WIDE = 200;
const EDGE = 8;

type Who = "me" | "partner";
type Slot = { wrap: HTMLDivElement | null; bubble: HTMLDivElement | null };

function Rig() {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const setDpr = useThree((s) => s.setDpr);
  useEffect(() => {
    setDpr(PIXELS_WIDE / size.width);
    const camera = get().camera;
    camera.zoom = Math.min(size.width / 5.6, size.height / 3.85);
    camera.lookAt(0, 1.35, 0);
    camera.updateProjectionMatrix();
  }, [get, size, setDpr]);
  return null;
}

// 머리 위 3D 좌표를 화면 좌표로 옮기고, 말풍선은 화면 안에 들어오게 밀되 꼬리는 머리를 가리키게 한다
function Anchors({ targets, slots }: { targets: Record<Who, THREE.Vector3>; slots: React.RefObject<Record<Who, Slot>> }) {
  const v = useRef(new THREE.Vector3());
  useFrame((state) => {
    const { width, height } = state.size;
    for (const who of ["me", "partner"] as const) {
      const slot = slots.current[who];
      if (!slot.wrap) continue;
      const bubbleWidth = slot.bubble?.offsetWidth ?? 0;
      const p = v.current.copy(targets[who]).project(state.camera);
      const x = (p.x * 0.5 + 0.5) * width;
      const y = (-p.y * 0.5 + 0.5) * height;
      slot.wrap.style.setProperty("transform", `translate(${x}px, ${y}px)`);
      if (slot.bubble) {
        const left = Math.min(Math.max(-bubbleWidth / 2, EDGE - x), width - EDGE - x - bubbleWidth);
        slot.bubble.style.setProperty("left", `${left}px`);
      }
    }
  });
  return null;
}

function TypingDots() {
  return (
    <span className="flex h-[1.4em] items-center gap-1 px-1" aria-label="내 차례">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-[typing_1s_infinite] bg-current" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}

function Backdrop({ wall }: { wall: string }) {
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

export type StageState = {
  partnerMotion: Motion;
  partnerKey: number;
  talkKey: number;
  reaction: Expression | null;
  meLine?: string;
  partnerLine?: string;
  meTurn?: boolean;
};

// 세트·시간·등장인물 조합을 픽셀 무대로 그리고, 캐릭터 머리 위에 말풍선과 반응 기호를 붙인다
export function PixelStage({ spec, state, reduced = false }: { spec: StageSpec; state?: StageState; reduced?: boolean }) {
  const set = SETS[spec.set];
  const evening = spec.time === "evening";
  const flags = useMemo(() => new Set(spec.flags), [spec.flags]);
  const targets = useMemo(
    () => ({
      me: new THREE.Vector3(set.me.x, headTop(set.me) + 0.12, set.me.z ?? 0),
      partner: new THREE.Vector3(set.partner.x, headTop(set.partner) + 0.12, set.partner.z ?? 0),
    }),
    [set],
  );
  const slots = useRef<Record<Who, Slot>>({ me: { wrap: null, bubble: null }, partner: { wrap: null, bubble: null } });
  const wall = set.wall[spec.time];
  const symbol = state?.reaction ? REACTION_SYMBOLS[state.reaction] : null;
  const ink = evening && spec.set === "street" ? "text-paper" : "text-ink";

  const bubble = (who: Who, text: React.ReactNode, key: string) => (
    <div ref={(el) => void (slots.current[who].wrap = el)} className="absolute left-0 top-0">
      {text && (
        <div key={key} className="blk-frame-sm animate-[fade-in_160ms]">
          <div
            ref={(el) => void (slots.current[who].bubble = el)}
            className="blk absolute bottom-[9px] w-max max-w-[13rem] bg-white px-2.5 py-1.5 text-[13px] font-medium leading-snug text-ink break-keep"
          >
            {text}
          </div>
          <span className="absolute bottom-[5px] left-0 h-[5px] w-[10px] -translate-x-1/2 bg-white" />
          <span className="absolute bottom-[1px] left-0 h-[5px] w-[4px] -translate-x-1/2 bg-white" />
        </div>
      )}
    </div>
  );

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: wall }}>
      <Canvas
        orthographic
        dpr={0.5}
        camera={{ position: [0, 1.6, 10], zoom: 70, near: 0.1, far: 50 }}
        gl={{ antialias: false }}
        style={{ imageRendering: "pixelated" }}
      >
        <Rig />
        {state && <Anchors targets={targets} slots={slots} />}
        <ambientLight intensity={evening ? 1.7 : 2.1} />
        <directionalLight position={[-3, 4, 6]} intensity={evening ? 0.9 : 1.2} />

        <Backdrop wall={wall} />
        <set.Scenery evening={evening} flags={flags} />
        <Figure placement={set.me} look={CAST.me} motion="idle" motionKey={0} talkKey={state?.talkKey ?? 0} reduced={reduced} />
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
        <div className={`pointer-events-none absolute inset-0 ${ink}`}>
          {bubble("me", state.meLine ?? (state.meTurn ? <TypingDots /> : null), state.meLine ?? "turn")}
          {symbol ? (
            <div ref={(el) => void (slots.current.partner.wrap = el)} className="absolute left-0 top-0">
              <div key={`${state.reaction}-${state.partnerKey}`} className="absolute bottom-0 left-0 -translate-x-1/2 animate-[pop_260ms_ease-out]">
                {symbol}
              </div>
            </div>
          ) : (
            bubble("partner", state.partnerLine, state.partnerLine ?? "")
          )}
        </div>
      )}
    </div>
  );
}
