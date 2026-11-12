"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Expression, Motion } from "@/features/scene/types";
import { CAST, HEROES } from "./cast";
import { DecorPieces } from "./decor";
import { Figure, headTop } from "./figure";
import { C, shade } from "./palette";
import { REACTION_SYMBOLS } from "./reactions";
import { SETS } from "./sets";
import { stagePixel } from "./stage-px";
import type { PropId, StageSpec } from "./types";

const EDGE = 8;
const BUBBLE_MAX = 208;
// 말풍선 아래 꼬리 자리. 말풍선 클래스의 bottom-[9px]와 같다
const BUBBLE_GAP = 9;

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

// 무대 너비와 상관없이 가로 200픽셀 안팎으로 그리도록 해상도 배율을 정한다.
// 화면의 실제 픽셀 수를 정수로 나눈 만큼만 그려서, 무대 한 칸이 늘 같은 개수의 화면 픽셀로 커진다.
// 200으로 딱 맞추면 7.8배처럼 배율이 소수가 되어 칸마다 굵기가 달라지고, 큰 화면에서 도트가 지저분하게 깨져 보인다.
// Canvas의 dpr 속성으로 넘겨야 다시 그릴 때마다 기본값으로 돌아가 픽셀 크기가 바뀌는 일이 없다
function usePixelDpr() {
  const box = useRef<HTMLDivElement>(null);
  const [dpr, setDpr] = useState(0.5);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width <= 0) return;
      const device = window.devicePixelRatio || 1;
      setDpr(1 / stagePixel(width, device));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { box, dpr };
}

// 말풍선 너비를 ResizeObserver로 기억해 둔다. 매 프레임 offsetWidth를 읽으면 그때마다 브라우저가 레이아웃을 다시 계산해서 무대가 무거워진다
function useBubbleWidths() {
  const [tracker] = useState(() => {
    const widths = new WeakMap<Element, number>();
    const heights = new WeakMap<Element, number>();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((entries) => {
            for (const e of entries) {
              widths.set(e.target, e.borderBoxSize?.[0]?.inlineSize ?? (e.target as HTMLElement).offsetWidth);
              heights.set(e.target, e.borderBoxSize?.[0]?.blockSize ?? (e.target as HTMLElement).offsetHeight);
            }
          });
    return { widths, heights, observer };
  });
  useEffect(() => () => tracker.observer?.disconnect(), [tracker]);
  return tracker;
}

// 같은 값을 다시 쓰지 않아서, 무대가 멈춰 있을 때는 말풍선 스타일을 건드리지 않는다
function setStyle(el: HTMLElement, name: string, value: string | null) {
  if (value === null) {
    if (el.style.getPropertyValue(name)) el.style.removeProperty(name);
  } else if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
}

// 머리 위 3D 좌표를 화면 좌표로 옮기고, 말풍선은 화면 안에 들어오게 밀되 꼬리는 머리를 가리키게 한다.
// 두 사람 말풍선이 함께 떠 있으면 두 머리 사이 중간에서 나눠 각자 자기 쪽 안에서만 펼쳐지게 한다.
// scale은 말풍선을 키운 배율. 말풍선 안쪽 치수(너비·높이·left)는 키우기 전 값이라, 화면 거리를 배율로 나눠서 맞춘다
function Anchors({
  targets,
  slots,
  widths,
  heights,
  observer,
  scale,
}: {
  targets: Record<Who, THREE.Vector3>;
  slots: React.RefObject<Record<Who, Slot>>;
  widths: WeakMap<Element, number>;
  heights: WeakMap<Element, number>;
  observer: ResizeObserver | null;
  scale: number;
}) {
  const v = useRef(new THREE.Vector3());
  // 지금 너비를 재고 있는 말풍선. 말풍선이 바뀌면 예전 것은 그만 잰다
  const watched = useRef<Record<Who, Element | null>>({ me: null, partner: null });
  useFrame((state) => {
    const { width, height } = state.size;
    const xs = { me: 0, partner: 0 };
    const ys = { me: 0, partner: 0 };
    for (const who of ["me", "partner"] as const) {
      const p = v.current.copy(targets[who]).project(state.camera);
      xs[who] = (p.x * 0.5 + 0.5) * width;
      ys[who] = (-p.y * 0.5 + 0.5) * height;
      const wrap = slots.current[who].wrap;
      if (wrap) setStyle(wrap, "transform", `translate(${xs[who]}px, ${ys[who]}px)`);
    }
    const both = Boolean(slots.current.me.bubble && slots.current.partner.bubble);
    const mid = (xs.me + xs.partner) / 2;
    for (const who of ["me", "partner"] as const) {
      const bubble = slots.current[who].bubble;
      if (watched.current[who] !== bubble) {
        if (watched.current[who]) observer?.unobserve(watched.current[who]);
        if (bubble) observer?.observe(bubble);
        watched.current[who] = bubble;
      }
      if (!bubble) continue;
      const [from, to] = !both ? [EDGE, width - EDGE] : who === "me" ? [EDGE, mid - EDGE / 2] : [mid + EDGE / 2, width - EDGE];
      setStyle(bubble, "max-width", both ? `${Math.floor(Math.min((to - from) / scale, BUBBLE_MAX))}px` : null);
      // 처음 뜬 말풍선은 아직 잰 너비가 없어서 한 번만 직접 잰다
      const w = widths.get(bubble) ?? bubble.offsetWidth;
      const x = xs[who];
      setStyle(bubble, "left", `${Math.min(Math.max(-w / 2, (from - x) / scale), (to - x) / scale - w)}px`);
      // 키 큰 캐릭터 위로 두 줄짜리 말풍선이 뜨면 무대 위로 잘리지 않게 아래로 내려 머리와 살짝 겹치게 둔다
      const top = ys[who] - (BUBBLE_GAP + (heights.get(bubble) ?? bubble.offsetHeight)) * scale;
      setStyle(bubble, "bottom", top < EDGE / 2 ? `${BUBBLE_GAP - (EDGE / 2 - top) / scale}px` : null);
    }
  });
  return null;
}

// 컷인 칸의 크기. 무대 너비에 대한 비율과 가로세로 비율(5:4). 화면의 테두리 칸(HTML)과 그리는 칸(WebGL)이 같은 값을 쓴다
const CUT_W = 0.3;
const CUT_EDGE = 8;
// 컷인 카메라가 담는 세계 크기(가로 절반). 얼굴과 어깨 위가 들어온다
const CUT_HALF = 0.62;
// 컷인에는 상대만 그린다. 상대와 조명을 이 레이어에도 올리고, 컷인 카메라는 이 레이어만 본다
const CUT_LAYER = 1;
// 컷인 바탕. 만화 컷처럼 단색으로 깔아 잘린 소품 조각이 섞이지 않게 한다
const CUT_BG = new THREE.Color("#ffe48a");
// 이보다 좁은 무대(작은 폰)에서는 컷인이 무대를 너무 가려서 띄우지 않는다
export const CUT_MIN_WIDTH = 380;

// 반응 순간 상대 얼굴을 무대 구석의 작은 칸에 한 번 더 그린다(만화·격투 게임의 컷인). 본 무대는 당기지 않고 그대로 둔다.
// 같은 장면을 두 번째 카메라로 한 번 더 그려서 WebGL 컨텍스트를 하나만 쓴다. 우선순위를 주면 기본 그리기를 이 함수가 맡는다
// low면 칸을 오른쪽 아래(바닥 쪽)에 둔다. 말풍선을 키운 넓은 무대에서는 상대 말풍선이 위쪽을 채워서 오른쪽 위에 두면 얼굴이 가린다
function CutIn({ target, on, low }: { target: THREE.Vector3; on: boolean; low: boolean }) {
  const cam = useMemo(() => {
    const c = new THREE.OrthographicCamera(-CUT_HALF, CUT_HALF, CUT_HALF * 0.8, -CUT_HALF * 0.8, 0.1, 50);
    c.layers.set(CUT_LAYER);
    return c;
  }, []);
  const clearColor = useMemo(() => new THREE.Color(), []);
  useFrame(({ gl, scene, camera, size }) => {
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    gl.render(scene, camera);
    if (!on || size.width < CUT_MIN_WIDTH) return;
    // 표정·소품이 바뀌면 상대 아래 물체도 바뀌어서, 띄울 때마다 상대와 조명을 컷인 레이어에 올린다
    scene.getObjectByName("cut-partner")?.traverse((o) => o.layers.enable(CUT_LAYER));
    scene.traverse((o) => (o as THREE.Light).isLight && o.layers.enable(CUT_LAYER));
    const w = Math.round(size.width * CUT_W);
    const h = Math.round(w * 0.8);
    // WebGL 좌표는 왼쪽 아래가 원점이다. 칸은 상대가 서 있는 오른쪽 위에 둔다
    const x = size.width - w - CUT_EDGE;
    const y = low ? CUT_EDGE : size.height - h - CUT_EDGE;
    cam.position.set(target.x, target.y - 0.32, 10);
    cam.lookAt(target.x, target.y - 0.32, 0);
    cam.updateProjectionMatrix();
    const clear = gl.autoClear;
    gl.autoClear = false;
    gl.setScissorTest(true);
    gl.setScissor(x, y, w, h);
    gl.setViewport(x, y, w, h);
    gl.getClearColor(clearColor);
    const alpha = gl.getClearAlpha();
    gl.setClearColor(CUT_BG, 1);
    gl.clear();
    gl.render(scene, cam);
    gl.setClearColor(clearColor, alpha);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    gl.autoClear = clear;
  }, 1);
  return null;
}

// 움직이는 동안 초당 30번만 다시 그린다. 가로 200픽셀짜리 픽셀 무대라 60번은 필요 없고, 그만큼 메인 스레드가 쉰다
const FPS = 30;

function Ticker() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = window.setInterval(() => invalidate(), 1000 / FPS);
    return () => clearInterval(id);
  }, [invalidate]);
  return null;
}

function TypingDots() {
  return (
    <span role="img" className="flex h-[1.4em] items-center gap-1 px-1" aria-label="내 차례">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-typing bg-current" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}

// 벽과 바닥. 실내는 벽 아래에 걸레받이를 두르고, 바닥 앞면 맨 윗줄을 밝게 해서 벽과 바닥이 만나는 곳에 깊이가 생기게 한다
function Backdrop({ wall, floor = C.floor, indoor }: { wall: string; floor?: string; indoor: boolean }) {
  return (
    <>
      <mesh position={[0, 1.5, -1.2]}>
        <planeGeometry args={[30, 6]} />
        <meshBasicMaterial color={wall} />
      </mesh>
      {indoor && (
        <mesh position={[0, 0.05, -1.195]}>
          <planeGeometry args={[30, 0.1]} />
          <meshBasicMaterial color={shade(wall, -0.16)} />
        </mesh>
      )}
      <mesh position={[0, -0.02, 1.205]}>
        <planeGeometry args={[30, 0.04]} />
        <meshBasicMaterial color={shade(floor, 0.12)} />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[30, 3, 2.4]} />
        <meshBasicMaterial color={floor} />
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
  // 고른 말을 들은 뒤 상대가 하는 반응. 있으면 반응 기호 대신 말풍선으로 띄운다.
  // 반응은 한국어 속마음이라 생각 풍선으로 그린다. 입으로 하는 말(영어)은 말풍선, 머릿속 말(한국어)은 생각 풍선이다
  partnerSays?: string;
  meTurn?: boolean;
  // 내가 고를 차례에 내 머리 위 생각 풍선에 띄우는 속마음(하고 싶은 말). 없으면 점 세 개로 차례만 알린다
  meThink?: string;
  // 보기 위에 마우스를 올리거나 키보드로 짚었을 때, 그 말을 속마음 아래에 미리 얹어 본다. 오른쪽 보기가 곧 내 캐릭터가 할 말이라는 걸 무대에서 바로 보여 준다
  meTry?: string;
  // 켜면 무대 구석 작은 칸에 상대 얼굴을 크게 한 번 더 보여 준다(컷인)
  cutIn?: boolean;
  // 고른 말을 들은 상대가 입 밖으로 하는 영어 한마디(겉말). 반응 기호와 속마음보다 먼저 말풍선으로 띄운다
  partnerSpeaks?: string;
};

// 하늘이 벽 자리에 오는 바깥 세트. 걸레받이를 그리지 않는다
const OUTDOOR: ReadonlySet<string> = new Set(["park", "street", "market"]);

// 대사 길이에 맞춘 말하는 시간(초). 짧은 한마디는 금방 끝나고 긴 문장은 입을 더 오래 움직인다
const talkSeconds = (line: string | undefined) => Math.min(2.6, Math.max(0.7, 0.5 + (line?.length ?? 0) * 0.045));

// 대사 글자에서 뽑은 번호. 대사가 바뀌면 번호가 바뀌어 말하는 동작이 새로 시작되고, 대사가 없으면 0이다
function lineKey(line: string | undefined) {
  if (!line) return 0;
  let h = 7;
  for (let i = 0; i < line.length; i++) h = (h * 31 + line.charCodeAt(i)) | 0;
  return h || 1;
}

// 계속 반복되는 동작. 이 동작 중에는 무대를 계속 그린다
const LOOPING: ReadonlySet<Motion> = new Set(["shiver", "dance", "panic", "sob", "wave", "facepalm", "patBelly"]);
// 한 번 하고 멈추는 동작이 끝나고 자세가 제자리를 찾기까지 걸리는 시간
const SETTLE_MS = 2500;

// 무대가 바뀐 직후와 반복 동작 중에만 계속 그리고, 멈춰 있을 때는 그리기를 쉬어 배터리와 CPU를 아낀다.
// 크기가 바뀌거나 무대 내용이 바뀌면 three.js가 알아서 한 번 다시 그린다
function useBusy(spec: StageSpec, state: StageState | undefined, reduced: boolean) {
  // 말풍선 그림(meNote)은 React 요소라 글자로 바꿀 수 없어서 빼고, 대신 meNoteKey로 바뀐 것을 안다
  const busyKey = JSON.stringify([spec, state], (key, value) => (key === "meNote" ? undefined : value));
  const looping = !reduced || LOOPING.has(state?.partnerMotion ?? "idle") || LOOPING.has(state?.meMotion ?? "idle");
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    if (looping) return;
    const t = setTimeout(() => setSettled(busyKey), reduced ? 100 : SETTLE_MS);
    return () => clearTimeout(t);
  }, [busyKey, looping, reduced]);
  return settled !== busyKey || looping;
}

// 세트·시간·등장인물 조합을 픽셀 무대로 그리고, 캐릭터 머리 위에 말풍선과 반응 기호를 붙인다
// onSnapshot을 주면 snapshotKey가 바뀔 때마다 무대를 한 장 찍어 넘긴다(장면 목록 썸네일)
function pickHandlers(onPick: ((who: "me" | "partner") => void) | undefined, who: "me" | "partner") {
  if (!onPick) return {};
  return {
    onClick: (e: { stopPropagation: () => void }) => (e.stopPropagation(), onPick(who)),
    onPointerOver: () => void (document.body.style.cursor = "pointer"),
    onPointerOut: () => void (document.body.style.cursor = ""),
  };
}

export function PixelStage({
  spec,
  state,
  reduced = false,
  paused = false,
  onSnapshot,
  snapshotKey,
  onPick,
  bubbleScale = 1,
}: {
  spec: StageSpec;
  state?: StageState;
  reduced?: boolean;
  // 말풍선과 반응 기호를 키우는 배율. 넓은 무대에서 도트 크기만큼 주면 인물과 글자의 비율이 휴대폰 무대와 같아진다(stage-px.ts)
  bubbleScale?: number;
  // 켜면 그리기를 멈춰 캐릭터 움직임까지 정지한다
  paused?: boolean;
  onSnapshot?: (url: string) => void;
  snapshotKey?: string;
  // 주인공이나 상대를 누르면 누가 눌렸는지 알려 준다. 넘기면 그 캐릭터 위에서 손 모양 커서가 된다
  onPick?: (who: "me" | "partner") => void;
}) {
  const set = SETS[spec.set];
  const evening = spec.time === "evening";
  // 장면 화면은 고를 때마다 무대 설정을 새로 만들어서, 내용이 같으면 같은 Set을 쓰도록 글자로 비교한다
  const flagsKey = (spec.flags ?? []).join(",");
  const flags = useMemo(() => new Set(flagsKey ? flagsKey.split(",") : []), [flagsKey]);
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
  const ink = evening && spec.set === "street" ? "text-fg" : "text-ink";
  // 벽·가구·소품은 말을 고를 때마다 바뀌지 않는다. 같은 요소를 다시 쓰면 React가 수백 개의 메시를 다시 맞춰 보지 않고 넘어가서 누른 뒤 반응이 빨라진다
  const scenery = useMemo(
    () => (
      <>
        <Backdrop wall={wall} floor={set.floor} indoor={!OUTDOOR.has(spec.set)} />
        <set.Scenery evening={evening} flags={flags} />
        <DecorPieces items={decor} />
      </>
    ),
    [set, wall, evening, flags, decor, spec.set],
  );
  const ground = set.floor ?? C.floor;
  const partnerSpeech = state?.partnerSpeaks ?? state?.partnerSays ?? state?.partnerLine;
  const busy = useBusy(spec, state, reduced);
  const { box, dpr } = usePixelDpr();
  const { widths, heights, observer } = useBubbleWidths();
  // 머리 위 기준점에서부터 키운다. 1배일 때는 스타일을 걸지 않아 휴대폰 무대는 전과 똑같이 그려진다
  const scaled = bubbleScale === 1 ? undefined : { transform: `scale(${bubbleScale})` };

  // think는 생각 풍선. 말풍선(흰 바탕, 계단 모서리, 뾰족한 꼬리)과 같은 도트 결이되, 위·아래가 도트 구름 혹으로 울퉁불퉁한 테두리(.think-cloud), 옅은 회청색 바탕, 작아지는 도트 동그라미 꼬리로 갈라 보이게 그린다.
  // 무대 위 말풍선이라 밤 화면에서도 같은 색을 쓴다
  const bubble = (who: Who, text: React.ReactNode, key: string, think = false) => (
    <div ref={(el) => void (slots.current[who].wrap = el)} className="absolute left-0 top-0">
      {text && (
        <div style={scaled} className="origin-top-left">
        <div key={key} className="animate-fade">
          <div className="blk-frame-sm">
            {think ? (
              <div
                ref={(el) => void (slots.current[who].bubble = el)}
                className="think-cloud absolute bottom-[12px] -my-1 w-max max-w-[14rem] font-stage text-note leading-snug break-keep text-ink-fixed"
              >
                {text}
              </div>
            ) : (
              <div
                ref={(el) => void (slots.current[who].bubble = el)}
                className="blk absolute bottom-[9px] w-max max-w-[13rem] bg-white px-2.5 py-1.5 font-stage text-note leading-snug break-keep text-ink"
              >
                {text}
              </div>
            )}
            {!think && (
              <>
                <span className="absolute bottom-[5px] left-0 h-[5px] w-[10px] -translate-x-1/2 bg-white" />
                <span className="absolute bottom-[1px] left-0 h-[5px] w-[4px] -translate-x-1/2 bg-white" />
              </>
            )}
          </div>
          {think && (
            <>
              {/* 꼬리는 머리 쪽으로 갈수록 작아지는 도트 동그라미 두 개 */}
              <svg aria-hidden width="12" height="10" viewBox="0 0 6 5" shapeRendering="crispEdges" className="absolute bottom-[3px] left-0 -translate-x-1/2">
                <path d="M1 0h4v1H1zM0 1h1v3H0zM5 1h1v3H5zM1 4h4v1H1z" fill="var(--color-ink-fixed)" />
                <path d="M1 1h4v3H1z" fill="var(--blue-100)" />
              </svg>
              <svg aria-hidden width="8" height="6" viewBox="0 0 4 3" shapeRendering="crispEdges" className="absolute -bottom-[5px] left-[4px]">
                <path d="M1 0h2v1H1zM0 1h1v1H0zM3 1h1v1H3zM1 2h2v1H1z" fill="var(--color-ink-fixed)" />
                <path d="M1 1h2v1H1z" fill="var(--blue-100)" />
              </svg>
            </>
          )}
        </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={box} className={`absolute inset-0 overflow-hidden ${paused ? "[&_*]:[animation-play-state:paused]" : ""}`} style={{ background: wall }}>
      <Canvas
        flat
        frameloop={paused ? "never" : "demand"}
        orthographic
        dpr={dpr}
        camera={{ position: [0, 1.6, 10], zoom: 70, near: 0.1, far: 50 }}
        gl={{ antialias: false }}
        style={{ imageRendering: "pixelated" }}
      >
        <Rig />
        {onSnapshot && <Snapshot key={snapshotKey} onSnapshot={onSnapshot} />}
        {busy && !paused && <Ticker />}
        {state && <Anchors targets={targets} slots={slots} widths={widths} heights={heights} observer={observer} scale={bubbleScale} />}
        {state && <CutIn target={targets.partner} on={Boolean(state.cutIn)} low={bubbleScale > 1} />}
        <ambientLight intensity={evening ? 1.7 : 2.1} />
        <directionalLight position={[-3, 4, 6]} intensity={evening ? 0.9 : 1.2} />

        {scenery}
        <group {...pickHandlers(onPick, "me")}>
        <Figure
          placement={set.me}
          look={{ ...CAST[HEROES[spec.hero ?? "girl"]], wear: spec.wear }}
          motion={state?.meMotion ?? "idle"}
          motionKey={state?.meKey ?? 0}
          talkKey={state?.talkKey ?? 0}
          reduced={reduced}
          prop={state?.meProp}
          talkFor={talkSeconds(state?.meLine)}
          ground={ground}
        />
        </group>
        <group name="cut-partner" {...pickHandlers(onPick, "partner")}>
        <Figure
          placement={set.partner}
          look={CAST[spec.partner]}
          motion={state?.partnerMotion ?? "idle"}
          motionKey={state?.partnerKey ?? 0}
          talkKey={lineKey(partnerSpeech)}
          reduced={reduced}
          prop={state?.partnerProp}
          expression={state?.reaction}
          talkFor={talkSeconds(partnerSpeech)}
          ground={ground}
        />
        </group>
      </Canvas>

      {state?.cutIn && (
        <div
          aria-hidden
          className="pointer-events-none absolute animate-pop outline outline-2 outline-ink-fixed max-[379px]:hidden"
          style={{ right: CUT_EDGE, [bubbleScale > 1 ? "bottom" : "top"]: CUT_EDGE, width: `${CUT_W * 100}%`, aspectRatio: "5 / 4" }}
        />
      )}
      {state && (
        <div className={`pointer-events-none absolute inset-0 ${ink}`}>
          {state.meNote
            ? bubble("me", state.meNote, `note-${state.meNoteKey ?? ""}`)
            : state.meLine
              ? bubble("me", state.meLine, state.meLine)
              : state.meTurn && state.meThink
                ? bubble(
                    "me",
                    <>
                      <span aria-label={`내 속마음: ${state.meThink}`}>{state.meThink}</span>
                      {state.meTry && (
                        <span key={state.meTry} aria-hidden className="mt-1 block animate-fade border-t border-dashed border-ink-fixed/40 pt-1">
                          {state.meTry}
                        </span>
                      )}
                    </>,
                    `think-${state.meThink}`,
                    true,
                  )
                : bubble("me", state.meTurn ? <TypingDots /> : null, "turn")}
          {state.partnerSpeaks ? (
            bubble("partner", state.partnerSpeaks, `speaks-${state.partnerKey}`)
          ) : state.partnerSays ? (
            bubble("partner", <span aria-label={`상대 속마음: ${state.partnerSays}`}>{state.partnerSays}</span>, `says-${state.partnerKey}`, true)
          ) : symbol ? (
            <div ref={(el) => void (slots.current.partner.wrap = el)} className="absolute left-0 top-0">
              <div style={scaled} className="origin-top-left">
                <div key={`${state.reaction}-${state.partnerKey}`} className="absolute bottom-0 left-0 -translate-x-1/2 animate-pop">
                  {symbol}
                </div>
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
