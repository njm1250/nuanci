"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Expression, Motion } from "../scene";
import { Character, type Look } from "./character";
import { DiningRoom } from "./dining-room";

export type CameraMode = "iso" | "cinema" | "mini";
export type Shot = "wide" | "me" | "partner";

const ME: Look = {
  skin: "#efc7a3",
  shirt: "#4e6a86",
  pants: "#3b3f47",
  hair: "#2a221e",
  hairStyle: "short",
  apron: "#ece4d2",
};

const PARTNER: Look = {
  skin: "#e2b28a",
  shirt: "#7f9868",
  pants: "#5a4a3c",
  hair: "#5b3a28",
  hairStyle: "bun",
};

const SHOTS: Record<"mini" | Shot, { pos: [number, number, number]; look: [number, number, number] }> = {
  mini: { pos: [-1.0, 2.0, 5.2], look: [0.25, 1.2, 0] },
  wide: { pos: [-1.9, 1.8, 1.1], look: [1.15, 1.15, 0] },
  me: { pos: [1.6, 1.7, -0.7], look: [-1.15, 1.2, 0] },
  partner: { pos: [-1.0, 1.6, 0.4], look: [1.15, 1.3, 0] },
};

const ANCHORS = {
  me: new THREE.Vector3(-1.15, 1.95, 0),
  partner: new THREE.Vector3(1.15, 2.2, 0),
};

export type Bubbles = {
  me?: string;
  partner?: string;
  thought?: string;
};

type AnchorEls = { me: HTMLDivElement | null; partner: HTMLDivElement | null };

function IsoCamera() {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const camera = get().camera;
    camera.zoom = Math.min(size.width / 6.1, size.height / 5.7);
    camera.lookAt(0, 1.1, 0);
    camera.updateProjectionMatrix();
  }, [get, size]);
  return null;
}

// 컷이 바뀌면 카메라를 바로 옮기고, 이후 천천히 다가가며 화면에 생기를 준다
function ShotCamera({ shotKey, cut, reduced }: { shotKey: "mini" | Shot; cut: boolean; reduced: boolean }) {
  const startedAt = useRef<number | null>(null);
  const look = useRef(new THREE.Vector3(...SHOTS[shotKey].look));
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    startedAt.current = null;
  }, [shotKey]);

  useFrame((state, dt) => {
    const camera = state.camera;
    const shot = SHOTS[shotKey];
    const target = tmp.current.set(...shot.look);
    if (startedAt.current === null) startedAt.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startedAt.current;

    if (cut) {
      const drift = reduced ? 0 : Math.min(1, t / 8) * 0.08;
      camera.position.set(...shot.pos).lerp(target, drift);
      look.current.copy(target);
    } else {
      const k = reduced ? 1 : 1 - Math.exp(-4 * dt);
      camera.position.lerp(new THREE.Vector3(...shot.pos), k);
      look.current.lerp(target, k);
    }
    camera.lookAt(look.current);
  });
  return null;
}

// 캐릭터 머리 위 3D 좌표를 매 프레임 화면 좌표로 바꿔 말풍선 위치를 맞춘다
function AnchorTracker({ els }: { els: React.RefObject<AnchorEls> }) {
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

const bubbleStyles = {
  me: "rounded-2xl rounded-br-sm bg-[#2b2622] text-[#f5efe6]",
  partner: "rounded-2xl rounded-bl-sm bg-white text-[#2b2622] shadow-[0_1px_0_rgba(0,0,0,0.08)]",
  thought: "rounded-[1.4rem] border border-dashed border-[#2b2622]/40 bg-[#fffaf1] text-[#2b2622] italic",
};

function Bubble({ kind, text }: { kind: keyof typeof bubbleStyles; text: string }) {
  const align = kind === "me" ? "-translate-x-[85%]" : "-translate-x-[20%]";
  return (
    <div
      key={text}
      className={`absolute bottom-0 left-0 w-max max-w-[10rem] ${align} animate-[bubble-in_220ms_ease-out] px-3 py-2 text-[13px] leading-snug break-keep ${bubbleStyles[kind]}`}
    >
      {text}
    </div>
  );
}

export function Stage({
  mode,
  shot = "wide",
  condition,
  partner,
  partnerKey,
  talkKey,
  bubbles,
  reduced,
  showContainer = false,
  className,
}: {
  mode: CameraMode;
  shot?: Shot;
  condition: "base" | "followUp";
  partner: { expression: Expression; motion: Motion };
  partnerKey: number;
  talkKey: number;
  bubbles?: Bubbles;
  reduced: boolean;
  showContainer?: boolean;
  className?: string;
}) {
  const later = condition === "followUp";
  const isIso = mode === "iso";
  const shotKey = mode === "mini" ? "mini" : shot;
  const anchorEls = useRef<AnchorEls>({ me: null, partner: null });
  const partnerText = bubbles?.thought ?? bubbles?.partner;

  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        orthographic={isIso}
        camera={
          isIso
            ? { position: [-6, 5.4, 6], zoom: 60, near: 0.1, far: 100 }
            : { position: SHOTS[shotKey].pos, fov: mode === "mini" ? 28 : 40, near: 0.05, far: 50 }
        }
        gl={{ antialias: true, alpha: true }}
      >
        {isIso ? <IsoCamera /> : <ShotCamera shotKey={shotKey} cut={mode === "cinema"} reduced={reduced} />}
        {bubbles && <AnchorTracker els={anchorEls} />}

        <hemisphereLight args={["#fff4e2", "#8a7a66", later ? 0.55 : 0.95]} />
        <directionalLight
          position={[-3, 7, 4]}
          intensity={later ? 0.7 : 1.5}
          color={later ? "#c9b8ff" : "#fff1dc"}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
          shadow-bias={-0.0008}
        />

        <DiningRoom condition={condition} enclosed={!isIso} showContainer={showContainer} />

        <Character
          position={[-1.15, 0, 0]}
          rotationY={Math.PI / 2}
          look={ME}
          expression="happy"
          motion="idle"
          motionKey={0}
          talkKey={talkKey}
          reduced={reduced}
        />
        <Character
          position={[1.15, 0, 0]}
          rotationY={-Math.PI / 2}
          look={PARTNER}
          expression={partner.expression}
          motion={partner.motion}
          motionKey={partnerKey}
          reduced={reduced}
        />
      </Canvas>

      {bubbles && (
        <div className="pointer-events-none absolute inset-0">
          <div ref={(el) => void (anchorEls.current.me = el)} className="absolute left-0 top-0">
            {bubbles.me && <Bubble kind="me" text={bubbles.me} />}
          </div>
          <div ref={(el) => void (anchorEls.current.partner = el)} className="absolute left-0 top-0">
            {partnerText && <Bubble kind={bubbles.thought ? "thought" : "partner"} text={partnerText} />}
          </div>
        </div>
      )}
    </div>
  );
}
