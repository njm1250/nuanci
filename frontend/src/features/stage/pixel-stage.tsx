"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Expression, Motion } from "@/features/scene/types";
import { CAST, HEROES } from "./cast";
import { DecorPieces } from "./decor";
import { Figure, headTop } from "./figure";
import { C } from "./palette";
import { REACTION_SYMBOLS } from "./reactions";
import { SETS } from "./sets";
import type { PropId, StageSpec } from "./types";

// 화면 크기와 상관없이 가로 픽셀 수를 고정해서 어떤 크기에서도 같은 도트 밀도로 보이게 한다
const PIXELS_WIDE = 200;
const EDGE = 8;
const BUBBLE_MAX = 208;

type Who = "me" | "partner";
type Slot = { wrap: HTMLDivElement | null; bubble: HTMLDivElement | null };

function Rig() {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const camera = get().camera;
    camera.zoom = Math.min(size.width / 5.6, size.height / 3.85);
    camera.lookAt(0, 1.35, 0);
    camera.updateProjectionMatrix();
  }, [get, size]);
  return null;
}

// 무대를 한 장 그려 그림 주소로 넘긴다. 그리고 바로 읽어서 그리기 버퍼를 남겨 두지 않아도 된다.
// 카메라 줌과 인물 자세가 자리 잡도록 잠깐 기다렸다가 한 번만 찍는다
function Snapshot({ onSnapshot }: { onSnapshot: (url: string) => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const callback = useRef(onSnapshot);
  useEffect(() => {
    callback.current = onSnapshot;
  });
  useEffect(() => {
    const t = window.setTimeout(() => {
      gl.render(scene, camera);
      callback.current(gl.domElement.toDataURL("image/png"));
    }, 250);
    return () => clearTimeout(t);
  }, [gl, scene, camera]);
  return null;
}

// 무대 너비와 상관없이 항상 가로 200픽셀로 그리도록 해상도 배율을 정한다.
// Canvas의 dpr 속성으로 넘겨야 다시 그릴 때마다 기본값으로 돌아가 픽셀 크기가 바뀌는 일이 없다
function usePixelDpr() {
  const box = useRef<HTMLDivElement>(null);
  const [dpr, setDpr] = useState(0.5);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setDpr(PIXELS_WIDE / width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { box, dpr };
}

// 머리 위 3D 좌표를 화면 좌표로 옮기고, 말풍선은 화면 안에 들어오게 밀되 꼬리는 머리를 가리키게 한다.
// 두 사람 말풍선이 함께 떠 있으면 두 머리 사이 중간에서 나눠 각자 자기 쪽 안에서만 펼쳐지게 한다
function Anchors({ targets, slots }: { targets: Record<Who, THREE.Vector3>; slots: React.RefObject<Record<Who, Slot>> }) {
  const v = useRef(new THREE.Vector3());
  useFrame((state) => {
    const { width, height } = state.size;
    const xs = { me: 0, partner: 0 };
    for (const who of ["me", "partner"] as const) {
      const p = v.current.copy(targets[who]).project(state.camera);
      xs[who] = (p.x * 0.5 + 0.5) * width;
      slots.current[who].wrap?.style.setProperty("transform", `translate(${xs[who]}px, ${(-p.y * 0.5 + 0.5) * height}px)`);
    }
    const both = Boolean(slots.current.me.bubble && slots.current.partner.bubble);
    const mid = (xs.me + xs.partner) / 2;
    for (const who of ["me", "partner"] as const) {
      const bubble = slots.current[who].bubble;
      if (!bubble) continue;
      const [from, to] = !both ? [EDGE, width - EDGE] : who === "me" ? [EDGE, mid - EDGE / 2] : [mid + EDGE / 2, width - EDGE];
      if (both) bubble.style.setProperty("max-width", `${Math.floor(Math.min(to - from, BUBBLE_MAX))}px`);
      else bubble.style.removeProperty("max-width");
      const x = xs[who];
      const left = Math.min(Math.max(-bubble.offsetWidth / 2, from - x), to - x - bubble.offsetWidth);
      bubble.style.setProperty("left", `${left}px`);
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
  meMotion?: Motion;
  meKey?: number;
  meProp?: PropId;
  partnerProp?: PropId;
  partnerMotion: Motion;
  partnerKey: number;
  talkKey: number;
  reaction: Expression | null;
  meLine?: string;
  // 대사 대신 주인공 말풍선에 잠깐 띄우는 그림과 글. meNoteKey가 바뀔 때마다 새로 뜬다
  meNote?: React.ReactNode;
  meNoteKey?: string;
  partnerLine?: string;
  meTurn?: boolean;
};

// 계속 반복되는 동작. 이 동작 중에는 무대를 계속 그린다
const LOOPING: ReadonlySet<Motion> = new Set(["shiver", "dance", "panic", "sob", "wave", "facepalm", "patBelly"]);
// 한 번 하고 멈추는 동작이 끝나고 자세가 제자리를 찾기까지 걸리는 시간
const SETTLE_MS = 2500;

// 무대가 바뀐 직후와 반복 동작 중에만 매 프레임 그리고, 멈춰 있을 때는 그리기를 쉬어 배터리와 CPU를 아낀다.
// 크기가 바뀌면 three.js가 알아서 한 번 다시 그린다
function useFrameloop(spec: StageSpec, state: StageState | undefined, reduced: boolean) {
  // 말풍선 그림(meNote)은 React 요소라 글자로 바꿀 수 없어서 빼고, 대신 meNoteKey로 바뀐 것을 안다
  const busyKey = JSON.stringify([spec, state], (key, value) => (key === "meNote" ? undefined : value));
  const looping = !reduced && (LOOPING.has(state?.partnerMotion ?? "idle") || LOOPING.has(state?.meMotion ?? "idle"));
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    if (looping) return;
    const t = setTimeout(() => setSettled(busyKey), reduced ? 100 : SETTLE_MS);
    return () => clearTimeout(t);
  }, [busyKey, looping, reduced]);
  return settled === busyKey && !looping ? "demand" : "always";
}

// 세트·시간·등장인물 조합을 픽셀 무대로 그리고, 캐릭터 머리 위에 말풍선과 반응 기호를 붙인다
// onSnapshot을 주면 snapshotKey가 바뀔 때마다 무대를 한 장 찍어 넘긴다(장면 목록 썸네일)
export function PixelStage({
  spec,
  state,
  reduced = false,
  onSnapshot,
  snapshotKey,
}: {
  spec: StageSpec;
  state?: StageState;
  reduced?: boolean;
  onSnapshot?: (url: string) => void;
  snapshotKey?: string;
}) {
  const set = SETS[spec.set];
  const evening = spec.time === "evening";
  const flags = useMemo(() => new Set(spec.flags), [spec.flags]);
  // flags에 bare가 있으면 세트 기본 소품을 빼고 장면이 직접 적은 소품만 붙인다(식탁 세트를 식당으로 쓸 때처럼)
  const decor = useMemo(() => [...(flags.has("bare") ? [] : (set.decor ?? [])), ...(spec.decor ?? [])], [set, flags, spec.decor]);
  const targets = useMemo(
    () => ({
      me: new THREE.Vector3(set.me.x, headTop(set.me) + 0.12, set.me.z ?? 0),
      partner: new THREE.Vector3(set.partner.x, headTop(set.partner, CAST[spec.partner]) + 0.12, set.partner.z ?? 0),
    }),
    [set, spec.partner],
  );
  const slots = useRef<Record<Who, Slot>>({ me: { wrap: null, bubble: null }, partner: { wrap: null, bubble: null } });
  const wall = set.wall[spec.time];
  const symbol = state?.reaction ? REACTION_SYMBOLS[state.reaction] : null;
  const ink = evening && spec.set === "street" ? "text-paper" : "text-ink";
  const frameloop = useFrameloop(spec, state, reduced);
  const { box, dpr } = usePixelDpr();

  const bubble = (who: Who, text: React.ReactNode, key: string) => (
    <div ref={(el) => void (slots.current[who].wrap = el)} className="absolute left-0 top-0">
      {text && (
        <div key={key} className="blk-frame-sm animate-[fade-in_160ms]">
          <div
            ref={(el) => void (slots.current[who].bubble = el)}
            className="blk absolute bottom-[9px] w-max max-w-[13rem] bg-white px-2.5 py-1.5 font-line text-[15px] leading-snug text-ink break-keep"
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
    <div ref={box} className="absolute inset-0 overflow-hidden" style={{ background: wall }}>
      <Canvas
        frameloop={frameloop}
        orthographic
        dpr={dpr}
        camera={{ position: [0, 1.6, 10], zoom: 70, near: 0.1, far: 50 }}
        gl={{ antialias: false }}
        style={{ imageRendering: "pixelated" }}
      >
        <Rig />
        {onSnapshot && <Snapshot key={snapshotKey} onSnapshot={onSnapshot} />}
        {state && <Anchors targets={targets} slots={slots} />}
        <ambientLight intensity={evening ? 1.7 : 2.1} />
        <directionalLight position={[-3, 4, 6]} intensity={evening ? 0.9 : 1.2} />

        <Backdrop wall={wall} />
        <set.Scenery evening={evening} flags={flags} />
        <DecorPieces items={decor} />
        <Figure
          placement={set.me}
          look={{ ...CAST[HEROES[spec.hero ?? "boy"]], wear: spec.wear }}
          motion={state?.meMotion ?? "idle"}
          motionKey={state?.meKey ?? 0}
          talkKey={state?.talkKey ?? 0}
          reduced={reduced}
          prop={state?.meProp}
        />
        <Figure
          placement={set.partner}
          look={CAST[spec.partner]}
          motion={state?.partnerMotion ?? "idle"}
          motionKey={state?.partnerKey ?? 0}
          talkKey={0}
          reduced={reduced}
          prop={state?.partnerProp}
        />
      </Canvas>

      {state && (
        <div className={`pointer-events-none absolute inset-0 ${ink}`}>
          {state.meNote
            ? bubble("me", state.meNote, `note-${state.meNoteKey ?? ""}`)
            : bubble("me", state.meLine ?? (state.meTurn ? <TypingDots /> : null), state.meLine ?? "turn")}
          {symbol ? (
            <div ref={(el) => void (slots.current.partner.wrap = el)} className="absolute left-0 top-0">
              <div key={`${state.reaction}-${state.partnerKey}`} className="absolute bottom-0 left-0 -translate-x-1/2 animate-[pop_260ms_steps(3,end)]">
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
