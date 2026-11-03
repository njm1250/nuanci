"use client";

import { C } from "./palette";
import { Box, Cyl, Flat, Gem, Glow, PixelText } from "./primitives";
import type { Decor, Placement, SetId } from "./types";
import { SET_WALLS } from "./walls";

type SceneryProps = { evening: boolean; flags: Set<string> };

export type SetDef = {
  label: string;
  wall: { day: string; evening: string };
  // 앞쪽 바닥 색. 없으면 공통 바닥 색을 쓴다
  floor?: string;
  me: Placement;
  partner: Placement;
  Scenery: (p: SceneryProps) => React.ReactNode;
  // 세트에 기본으로 붙는 소품 스티커(decor.tsx). 어느 장면이든 사람이 사는 곳처럼 보이게 하고, Mochi와 푸딩을 숨겨 둔다
  decor?: Decor[];
};

const R = Math.PI / 2;
const WALL_Z = -1.15;

function Window({ x, y, w = 1.1, h = 0.8, evening, blinds = false }: { x: number; y: number; w?: number; h?: number; evening: boolean; blinds?: boolean }) {
  return (
    <>
      <Flat size={[w, h]} at={[x, y, WALL_Z]} color={evening ? C.night : C.sky} />
      {blinds
        ? [0.3, 0.1, -0.1, -0.3].map((d) => <Flat key={d} size={[w, 0.03]} at={[x, y + d * h, WALL_Z + 0.01]} color={C.ink} />)
        : <Flat size={[0.04, h]} at={[x, y, WALL_Z + 0.01]} color={C.ink} />}
    </>
  );
}

function Pendant({ x, on, y = 2.3 }: { x: number; on: boolean; y?: number }) {
  return (
    <>
      <Box size={[0.03, 3.2 - y, 0.03]} at={[x, (3.2 + y) / 2, 0]} color={C.ink} />
      <mesh position={[x, y, 0]}>
        <coneGeometry args={[0.24, 0.2, 6]} />
        <meshLambertMaterial color={C.ink} flatShading />
      </mesh>
      <Glow size={[0.1, 0.06, 0.1]} at={[x, y - 0.12, 0]} on={on} />
    </>
  );
}

function Plant({ x, z = -0.6 }: { x: number; z?: number }) {
  return (
    <>
      <Cyl r={[0.17, 0.13]} h={0.38} at={[x, 0.19, z]} color={C.brick} />
      <Gem r={0.3} at={[x, 0.62, z]} color={C.leaf} />
      <Gem r={0.2} at={[x + 0.12, 0.88, z]} color="#5f8a57" />
    </>
  );
}

function Chair({ x, back }: { x: number; back: 1 | -1 }) {
  return (
    <>
      <Box size={[0.5, 0.06, 0.5]} at={[x, 0.5, 0]} color={C.woodDark} />
      <Box size={[0.06, 0.72, 0.5]} at={[x + 0.28 * back, 0.86, 0]} color={C.woodDark} />
      <Box size={[0.06, 0.5, 0.06]} at={[x - 0.2 * back, 0.25, 0.2]} color={C.woodDark} />
    </>
  );
}

// 사람이 앉는 의자. 앉은 사람과 같은 방향으로 돌려서 등받이가 몸 뒤에 오게 한다
function Seat({ x, facing, seat, back, head }: { x: number; facing: number; seat: string; back: string; head?: string }) {
  return (
    <group position={[x, 0, 0]} rotation={[0, facing, 0]}>
      <Box size={[0.55, 0.1, 0.5]} at={[0, 0.48, 0]} color={seat} />
      <Box size={[0.55, 0.95, 0.12]} at={[0, 0.95, -0.28]} color={back} />
      {head && <Box size={[0.4, 0.18, 0.13]} at={[0, 1.34, -0.27]} color={head} />}
      <Box size={[0.06, 0.45, 0.06]} at={[0, 0.22, 0]} color={C.ink} />
    </group>
  );
}

export const SETS: Record<SetId, SetDef> = {
  dining: {
    label: "집 · 식탁",
    wall: SET_WALLS.dining,
    me: { x: -1.15, facing: R, posture: "sit" },
    partner: { x: 1.15, facing: -R, posture: "sit" },
    Scenery: ({ evening, flags }) => (
      <>
        <Window x={-1.9} y={1.95} evening={evening} />
        <Pendant x={0} on={evening} />
        <Box size={[1.7, 0.08, 1.0]} at={[0, 0.78, 0]} color={C.wood} />
        {[-0.76, 0.76].map((x) => (
          <Box key={x} size={[0.08, 0.74, 0.08]} at={[x, 0.37, 0.4]} color={C.woodDark} />
        ))}
        <Chair x={-1.15} back={-1} />
        <Chair x={1.15} back={1} />
        {[
          { x: -0.48, full: true },
          { x: 0.48, full: !flags.has("plate-empty") },
        ].map(({ x, full }) => (
          <group key={x}>
            <Box size={[0.42, 0.03, 0.42]} at={[x, 0.83, 0.1]} color={C.plate} />
            {full && <Gem r={0.1} at={[x, 0.9, 0.1]} color={C.food} />}
          </group>
        ))}
        <Cyl r={[0.2, 0.16]} h={0.2} at={[0, 0.92, -0.2]} color={C.ink} />
        <Gem r={0.13} at={[0, 1.04, -0.2]} color="#d98a3a" />
        {flags.has("takeout") && <Box size={[0.3, 0.14, 0.22]} at={[0.42, 0.9, 0.35]} color={C.plate} />}
      </>
    ),
    decor: [
      { id: "fridge", x: 2.35 },
      { id: "pudding", x: 2.22, y: 1.8, z: -0.8 },
      { id: "calendar", x: -0.75, y: 2.2 },
      { id: "mochi", x: -2.35 },
    ],
  },

  office: {
    label: "사무실 · 책상",
    wall: SET_WALLS.office,
    me: { x: -1.25, facing: R, posture: "stand" },
    partner: { x: 1.3, facing: -R, posture: "sit" },
    Scenery: ({ evening, flags }) => (
      <>
        <Window x={-1.75} y={1.95} w={1.0} h={0.9} evening={evening} blinds />
        <Cyl r={0.23} h={0.03} at={[0.35, 2.35, WALL_Z]} color={C.ink} sides={12} rot={[R, 0, 0]} />
        <Cyl r={0.2} h={0.04} at={[0.35, 2.35, WALL_Z + 0.01]} color={C.paper} sides={12} rot={[R, 0, 0]} />
        <Box size={[0.025, 0.14, 0.02]} at={[0.35, 2.4, WALL_Z + 0.05]} color={C.ink} />
        <Box size={[0.025, 0.11, 0.02]} at={[0.35, 2.35, WALL_Z + 0.05]} color={C.ink} rot={[0, 0, evening ? Math.PI : -R]} />
        <Box size={[1.2, 0.06, 0.7]} at={[0.4, 0.76, 0]} color={C.paper} />
        {[-0.15, 0.95].map((x) => (
          <Box key={x} size={[0.05, 0.73, 0.05]} at={[x, 0.37, 0.3]} color={C.metal} />
        ))}
        <Box size={[0.36, 0.03, 0.26]} at={[0.3, 0.805, 0]} color={C.metal} />
        <Box size={[0.03, 0.26, 0.34]} at={[0.12, 0.93, 0]} color={C.ink} rot={[0, 0, -0.25]} />
        <Cyl r={0.05} h={0.11} at={[0.75, 0.84, 0.15]} color={flags.has("file-sent") ? C.mustard : C.plate} />
        <Box size={[0.48, 0.06, 0.48]} at={[1.3, 0.5, 0]} color={C.ink} />
        <Box size={[0.05, 0.6, 0.44]} at={[1.57, 0.86, 0]} color={C.ink} />
        <Cyl r={0.03} h={0.45} at={[1.3, 0.25, 0]} color={C.metal} />
        <Box size={[0.5, 0.04, 0.1]} at={[1.3, 0.03, 0]} color={C.metal} />
        <Plant x={-2.35} />
      </>
    ),
    decor: [
      { id: "whiteboard", x: 2.05 },
      { id: "calendar", x: -0.55 },
      { id: "aircon", x: -1.75 },
      { id: "papers", x: -0.05, y: 0.79, z: 0.15 },
      { id: "pudding", x: 0.55, y: 0.79, z: -0.2 },
      { id: "multitap", x: 0.4, z: -0.9 },
      { id: "mochi", x: 2.4, z: -0.6 },
    ],
  },

  cafe: {
    label: "카페 · 카운터",
    wall: SET_WALLS.cafe,
    me: { x: -1.05, facing: R, posture: "stand" },
    partner: { x: 1.05, z: -0.65, facing: -R, posture: "stand" },
    Scenery: ({ evening, flags }) => (
      <>
        <Flat size={[1.3, 0.75]} at={[0.6, 2.25, WALL_Z]} color={C.ink} />
        {[0.15, 0, -0.15].map((d) => (
          <Flat key={d} size={[0.8, 0.03]} at={[0.5, 2.25 + d, WALL_Z + 0.01]} color={C.paper} />
        ))}
        <Pendant x={-0.5} y={2.45} on={evening} />
        <Pendant x={1.7} y={2.45} on={evening} />
        <Box size={[1.5, 1.0, 0.6]} at={[0.55, 0.5, 0]} color={C.wood} />
        <Box size={[1.6, 0.06, 0.7]} at={[0.55, 1.03, 0]} color="#d9d6cf" />
        <Box size={[0.36, 0.34, 0.3]} at={[0.95, 1.23, -0.12]} color={C.metal} />
        <Box size={[0.2, 0.06, 0.12]} at={[0.95, 1.42, -0.12]} color={C.ink} />
        {flags.has("cup-ready") && (
          <>
            <Cyl r={[0.07, 0.055]} h={0.18} at={[0.05, 1.15, 0.12]} color={C.plate} />
            <Box size={[0.16, 0.025, 0.16]} at={[0.05, 1.245, 0.12]} color={C.ink} />
          </>
        )}
        <Plant x={-2.2} />
      </>
    ),
    decor: [
      { id: "poster", x: -1.85 },
      { id: "umbrella-stand", x: -1.55 },
      { id: "mug", x: 0.35, y: 1.06, z: 0.15 },
      { id: "mochi", x: -0.02, y: 1.06, z: 0.05 },
    ],
  },

  living: {
    label: "거실 · 소파",
    wall: SET_WALLS.living,
    me: { x: -1.0, z: -0.2, facing: 0.55, posture: "sit" },
    partner: { x: 1.0, z: -0.2, facing: -0.55, posture: "sit" },
    Scenery: ({ evening, flags }) => (
      <>
        <Box size={[2.8, 0.42, 0.8]} at={[0, 0.27, -0.45]} color={C.slate} />
        <Box size={[2.8, 0.62, 0.2]} at={[0, 0.75, -0.8]} color={C.slate} />
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.2, 0.58, 0.8]} at={[1.5 * s, 0.38, -0.45]} color="#5d6d79" />
        ))}
        <Cyl r={0.02} h={1.7} at={[2.15, 0.85, -0.5]} color={C.ink} />
        <Cyl r={[0.16, 0.24]} h={0.3} at={[2.15, 1.75, -0.5]} color={evening ? C.lampOn : C.lampOff} />
        <Box size={[0.36, 0.04, 0.36]} at={[2.15, 0.02, -0.5]} color={C.ink} />
        {flags.has("tissues") && <Box size={[0.24, 0.12, 0.14]} at={[-1.5, 0.73, -0.45]} color={C.plate} />}
        <Plant x={-2.45} />
      </>
    ),
    decor: [
      { id: "picture", x: 0, y: 2.15 },
      { id: "aircon", x: 1.25 },
      { id: "slippers", x: -0.3, z: 0.4 },
      { id: "parcel", x: -1.95, z: -0.9 },
      { id: "mochi", x: 0.35, y: 1.06, z: -0.8 },
    ],
  },

  park: {
    label: "공원 · 벤치",
    wall: SET_WALLS.park,
    me: { x: -0.75, z: -0.2, facing: 0.5, posture: "sit" },
    partner: { x: 0.75, z: -0.2, facing: -0.5, posture: "sit" },
    Scenery: ({ evening }) => (
      <>
        <Box size={[30, 0.03, 2.4]} at={[0, 0.015, 0]} color={evening ? "#3f5f3a" : "#6f9a4f"} />
        <Box size={[30, 0.5, 0.3]} at={[0, 0.25, WALL_Z + 0.1]} color={evening ? "#33502f" : "#4f7a4a"} />
        <Cyl r={0.12} h={1.6} at={[-1.9, 0.8, -0.8]} color={C.woodDark} />
        <Gem r={0.75} at={[-1.9, 1.95, -0.8]} color={C.leaf} />
        <Gem r={0.5} at={[-1.5, 2.35, -0.7]} color="#5f8a57" />
        <Box size={[2.6, 0.08, 0.5]} at={[0, 0.5, -0.4]} color={C.wood} />
        <Box size={[2.6, 0.32, 0.06]} at={[0, 0.82, -0.66]} color={C.wood} />
        {[-1.15, 1.15].map((x) => (
          <Box key={x} size={[0.08, 0.5, 0.42]} at={[x, 0.25, -0.4]} color={C.ink} />
        ))}
        <Cyl r={0.04} h={2.4} at={[2.0, 1.2, -0.6]} color={C.ink} />
        <Box size={[0.3, 0.14, 0.3]} at={[2.0, 2.45, -0.6]} color={C.ink} />
        <Glow size={[0.22, 0.04, 0.22]} at={[2.0, 2.37, -0.6]} on={evening} />
      </>
    ),
    decor: [
      { id: "shopping-bag", x: -1.5, z: -0.15 },
      { id: "mochi", x: 1.55, z: -0.1 },
    ],
  },

  elevator: {
    label: "엘리베이터 안",
    wall: SET_WALLS.elevator,
    me: { x: -0.55, facing: 0.35, posture: "stand" },
    partner: { x: 0.55, facing: -0.35, posture: "stand" },
    Scenery: ({ flags }) => (
      <>
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.1, 3.4, 1.8]} at={[1.6 * s, 1.7, -0.25]} color="#8c9296" />
        ))}
        {[-0.55, 0.55].map((x) => (
          <Flat key={x} size={[0.03, 2.6]} at={[x, 1.5, WALL_Z + 0.01]} color="#8c9296" />
        ))}
        <Box size={[2.6, 0.05, 0.06]} at={[0, 1.0, -1.0]} color="#6e757a" />
        <Box size={[0.22, 0.55, 0.04]} at={[1.25, 1.35, -1.05]} color={C.ink} />
        {[1.5, 1.38, 1.26].map((y, i) => (
          <Glow key={y} size={[0.07, 0.05, 0.02]} at={[1.25, y, -1.02]} on={i === 1} />
        ))}
        <Flat size={[0.6, 0.22]} at={[0, 2.65, WALL_Z + 0.01]} color={C.ink} />
        <Flat size={[0.2, 0.1]} at={[0, 2.65, WALL_Z + 0.02]} color={flags.has("stuck") ? "#d4265f" : "#e1ad34"} />
        <Glow size={[1.6, 0.04, 0.6]} at={[0, 3.05, -0.4]} on />
      </>
    ),
    decor: [{ id: "notice", x: -1.05 }],
  },

  store: {
    label: "편의점 · 계산대",
    wall: SET_WALLS.store,
    me: { x: -0.95, facing: R, posture: "stand" },
    partner: { x: 1.0, z: -0.65, facing: -R, posture: "stand" },
    Scenery: ({ flags }) => (
      <>
        <Flat size={[8, 0.14]} at={[0, 2.85, WALL_Z + 0.01]} color={C.teal} />
        <Flat size={[8, 0.06]} at={[0, 2.74, WALL_Z + 0.01]} color={C.mustard} />
        <Box size={[1.3, 1.7, 0.35]} at={[-1.75, 0.85, -0.85]} color="#d9d6cf" />
        {[0.45, 0.95, 1.45].map((y, row) =>
          [-2.2, -1.95, -1.7, -1.45, -1.2].map((x, i) => (
            <Box key={`${y}-${x}`} size={[0.18, 0.28, 0.12]} at={[x, y + 0.14, -0.7]} color={["#d4265f", C.mustard, C.teal, "#f08aa8", C.navy][(i + row) % 5]} />
          )),
        )}
        <Box size={[0.8, 2.0, 0.4]} at={[2.25, 1.0, -0.85]} color={C.metal} />
        <Flat size={[0.6, 1.6]} at={[2.25, 1.05, -0.64]} color="#cfe8f0" />
        <Box size={[1.4, 1.0, 0.6]} at={[0.75, 0.5, 0]} color="#f3f1ea" />
        <Flat size={[1.4, 0.1]} at={[0.75, 0.8, 0.31]} color={C.teal} />
        <Box size={[0.32, 0.22, 0.28]} at={[1.1, 1.11, -0.1]} color={C.ink} />
        <Box size={[0.22, 0.12, 0.02]} at={[1.1, 1.28, -0.02]} color="#9fd3e8" />
        {flags.has("ramen") && (
          <>
            <Cyl r={[0.09, 0.07]} h={0.16} at={[0.3, 1.08, 0.1]} color="#d4265f" />
            <Cyl r={0.092} h={0.02} at={[0.3, 1.17, 0.1]} color={C.plate} />
          </>
        )}
        {flags.has("snack") && <Box size={[0.22, 0.28, 0.06]} at={[0.55, 1.14, 0.1]} color={C.mustard} rot={[0, 0.3, 0.15]} />}
      </>
    ),
    decor: [
      { id: "poster", x: 0.2, y: 2.2 },
      { id: "parcel", x: -0.55 },
      { id: "mochi", x: 2.25, y: 2.0, z: -0.85 },
    ],
  },

  karaoke: {
    label: "노래방",
    wall: SET_WALLS.karaoke,
    me: { x: -0.95, z: -0.2, facing: 0.55, posture: "sit" },
    partner: { x: 0.95, z: -0.2, facing: -0.55, posture: "sit" },
    Scenery: ({ flags }) => (
      <>
        <Flat size={[1.8, 1.0]} at={[0, 2.1, WALL_Z + 0.01]} color="#141a3a" />
        <Flat size={[1.1, 0.06]} at={[0, 1.9, WALL_Z + 0.02]} color="#c8f031" />
        <Flat size={[0.8, 0.06]} at={[0, 1.76, WALL_Z + 0.02]} color="#f08aa8" />
        {flags.has("score") && <Flat size={[0.55, 0.22]} at={[0, 2.4, WALL_Z + 0.02]} color="#e8b931" />}
        <Flat size={[8, 0.05]} at={[0, 1.15, WALL_Z + 0.01]} color="#f08aa8" />
        <Box size={[2.9, 0.42, 0.8]} at={[0, 0.27, -0.45]} color="#7a3b6a" />
        <Box size={[2.9, 0.62, 0.2]} at={[0, 0.75, -0.8]} color="#7a3b6a" />
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.2, 0.58, 0.8]} at={[1.55 * s, 0.38, -0.45]} color="#5e2c52" />
        ))}
        <Box size={[0.03, 0.4, 0.03]} at={[0, 3.0, -0.3]} color={C.ink} />
        <Gem r={0.17} at={[0, 2.75, -0.3]} color="#c9ced2" />
      </>
    ),
    decor: [{ id: "tambourine", x: -1.55, y: 0.67, z: -0.45 }],
  },

  gym: {
    label: "헬스장",
    wall: SET_WALLS.gym,
    me: { x: -0.7, facing: R, posture: "stand" },
    partner: { x: 0.7, facing: -R, posture: "stand" },
    Scenery: () => (
      <>
        <Box size={[30, 0.02, 2.4]} at={[0, 0.01, 0]} color="#3a3a3a" />
        <Flat size={[2.4, 1.7]} at={[0.1, 1.7, WALL_Z + 0.01]} color="#cfe4ec" />
        {[-0.5, -0.3].map((x) => (
          <Flat key={x} size={[0.05, 1.5]} at={[x, 1.7, WALL_Z + 0.02]} color="#f2f8fa" />
        ))}
        <Flat size={[0.5, 0.7]} at={[2.1, 2.1, WALL_Z + 0.01]} color={C.rust} />
        <Flat size={[0.34, 0.08]} at={[2.1, 2.2, WALL_Z + 0.02]} color={C.paper} />
        <Box size={[1.0, 0.06, 0.35]} at={[-1.9, 0.62, -0.8]} color={C.ink} />
        {[-2.3, -1.5].map((x) => (
          <Box key={x} size={[0.06, 0.62, 0.3]} at={[x, 0.31, -0.8]} color={C.ink} />
        ))}
        {[-2.2, -1.9, -1.6].map((x) => (
          <Cyl key={x} r={0.06} h={0.24} at={[x, 0.72, -0.8]} color="#4a4a4a" rot={[R, 0, 0]} />
        ))}
        <Gem r={0.14} at={[1.95, 0.14, -0.6]} color={C.ink} />
        <Box size={[0.16, 0.04, 0.04]} at={[1.95, 0.32, -0.6]} color={C.ink} />
      </>
    ),
    decor: [{ id: "fan", x: 1.45 }],
  },

  sleephall: {
    label: "수면 대회장",
    wall: SET_WALLS.sleephall,
    floor: "#2c3460",
    me: { x: -0.75, facing: R, posture: "stand" },
    partner: { x: 0.75, facing: -R, posture: "stand" },
    // siren은 빨간 경광등과 대형 스피커가 켜진 방해 작전 중인 모습이다
    Scenery: ({ flags }) => (
      <>
        <Box size={[30, 0.02, 2.4]} at={[0, 0.01, 0]} color="#39437a" />
        <Flat size={[3.1, 0.5]} at={[0, 2.95, WALL_Z + 0.02]} color="#191f45" />
        <PixelText text="$1000000" at={[0, 2.95, WALL_Z + 0.03]} px={0.05} color="#e8b931" />
        <Gem r={0.32} at={[-2.3, 2.45, WALL_Z + 0.1]} color="#f5e9b0" />
        <Gem r={0.25} at={[-2.14, 2.54, WALL_Z + 0.25]} color={flags.has("siren") ? "#2a3058" : "#3f4a7a"} />
        {[[-1.3, 2.3], [-0.5, 2.0], [0.7, 2.35], [1.5, 2.05], [2.5, 2.45]].map(([x, y]) => (
          <Flat key={x} size={[0.05, 0.05]} at={[x, y, WALL_Z + 0.02]} color="#f6f4ee" />
        ))}
        {[-2.35, 2.35].map((x) => (
          <group key={x}>
            <Box size={[1.35, 0.3, 0.72]} at={[x, 0.2, -0.65]} color={C.woodDark} />
            <Box size={[1.25, 0.14, 0.68]} at={[x, 0.4, -0.65]} color="#e9e6f5" />
            <Box size={[0.3, 0.1, 0.4]} at={[x + 0.42, 0.52, -0.65]} color="#f7f5ec" />
            <Box size={[0.8, 0.17, 0.7]} at={[x - 0.2, 0.43, -0.64]} color="#7f8fd0" />
          </group>
        ))}
        {flags.has("siren") && (
          <>
            <Box size={[0.3, 0.2, 0.2]} at={[-1.05, 2.45, WALL_Z + 0.1]} color="#e03131" />
            <Box size={[0.3, 0.2, 0.2]} at={[1.05, 2.45, WALL_Z + 0.1]} color="#e03131" />
            <Box size={[0.5, 0.82, 0.32]} at={[0.05, 0.42, -0.85]} color={C.ink} />
            <Cyl r={0.18} h={0.03} at={[0.05, 0.56, -0.68]} color="#6b6b70" rot={[Math.PI / 2, 0, 0]} sides={10} />
            <Cyl r={0.11} h={0.03} at={[0.05, 0.2, -0.68]} color="#6b6b70" rot={[Math.PI / 2, 0, 0]} sides={10} />
          </>
        )}
      </>
    ),
  },

  freezer: {
    label: "냉동 대회장",
    wall: SET_WALLS.freezer,
    floor: "#e4f3fa",
    me: { x: -0.75, facing: R, posture: "stand" },
    partner: { x: 0.75, facing: -R, posture: "stand" },
    // blizzard는 눈보라, locked는 빨간 잠금 램프, frozen은 벽까지 얼어붙은 모습이다
    Scenery: ({ flags }) => (
      <>
        <Box size={[30, 0.02, 2.4]} at={[0, 0.01, 0]} color="#d8eef7" />
        {[-1.3, 0, 1.3].map((x) => (
          <Flat key={x} size={[1.2, 3.2]} at={[x, 1.8, WALL_Z + 0.005]} color="#a9cfe2" />
        ))}
        <Flat size={[3.1, 0.5]} at={[0, 2.95, WALL_Z + 0.02]} color="#1f4f7a" />
        <PixelText text="$1000000" at={[0, 2.95, WALL_Z + 0.03]} px={0.05} color="#e8b931" />
        {[-2.75, -2.35, -1.95, 1.95, 2.35, 2.75].map((x, i) => (
          <Cyl key={x} r={[0.07, 0.008]} h={i % 2 ? 0.34 : 0.5} at={[x, 3.12 - (i % 2 ? 0.17 : 0.25), WALL_Z + 0.12]} color="#e6f7ff" sides={4} rot={[Math.PI, 0, 0]} />
        ))}
        <Box size={[0.9, 1.75, 0.1]} at={[-2.4, 0.88, WALL_Z + 0.08]} color="#7f9fb2" />
        <Box size={[0.08, 0.34, 0.08]} at={[-2.1, 0.95, WALL_Z + 0.16]} color={C.ink} />
        <Glow size={[0.16, 0.16, 0.05]} at={[-2.4, 1.95, WALL_Z + 0.1]} on={!flags.has("locked")} />
        {flags.has("locked") && <Box size={[0.2, 0.2, 0.06]} at={[-2.4, 1.95, WALL_Z + 0.12]} color="#e03131" />}
        {flags.has("frozen") &&
          [0.9, 0.6, 1.1, 0.7, 1.3, 0.5, 0.8, 1.2, 0.6, 1.0, 0.7, 1.4, 0.6, 0.9, 1.1].map((h, i) => (
            <Flat key={i} size={[0.42, h]} at={[-2.94 + i * 0.42, h / 2 + 0.05, WALL_Z + 0.03]} color="#eef9fe" />
          ))}
        {flags.has("blizzard") &&
          [
            [-2.4, 2.4, 0.5], [-1.9, 1.5, 0.2], [-1.4, 2.6, 0.7], [-0.8, 1.2, 0.4], [-0.3, 2.2, 0.8],
            [0.3, 1.0, 0.6], [0.8, 2.5, 0.3], [1.3, 1.5, 0.8], [1.9, 2.3, 0.5], [2.4, 1.1, 0.3],
          ].map(([x, y, z]) => <Gem key={`${x}-${y}`} r={0.05} at={[x, y, z]} color="#ffffff" />)}
      </>
    ),
    decor: [
      { id: "thermometer", x: 2.4 },
      { id: "snow-pile", x: -1.7 },
      { id: "snow-pile", x: 1.9 },
    ],
  },

  room: {
    label: "아지트",
    wall: SET_WALLS.room,
    me: { x: -0.85, facing: 0.45, posture: "stand" },
    partner: { x: 1.05, z: -0.2, facing: -0.55, posture: "sit" },
    // 보상으로 받은 물건이 flags로 들어와 방에 놓인다. books-N은 책장에 꽂힌 책 수다
    Scenery: ({ evening, flags }) => {
      const books = Number([...flags].find((f) => f.startsWith("books-"))?.slice(6) ?? 0);
      return (
        <>
          <Window x={0.2} y={2.0} w={1.0} h={0.7} evening={evening} />
          <Box size={[1.3, 0.42, 0.95]} at={[1.15, 0.21, -0.35]} color="#7fa6c2" />
          <Box size={[1.3, 0.12, 0.95]} at={[1.15, 0.48, -0.35]} color={C.plate} />
          <Box size={[0.4, 0.12, 0.3]} at={[1.6, 0.6, -0.55]} color="#f6ead6" />
          <Box size={[0.95, 1.8, 0.35]} at={[-2.05, 0.9, -0.85]} color={C.woodDark} />
          {[0.35, 0.95, 1.55].map((y) => (
            <Box key={y} size={[0.85, 0.04, 0.3]} at={[-2.05, y, -0.8]} color={C.wood} />
          ))}
          {Array.from({ length: Math.min(books, 24) }, (_, i) => (
            <Box
              key={i}
              size={[0.08, 0.36, 0.22]}
              at={[-2.4 + (i % 8) * 0.1, 0.55 + Math.floor(i / 8) * 0.6, -0.78]}
              color={["#d4265f", C.mustard, C.teal, C.navy, "#f08aa8"][i % 5]}
            />
          ))}
          {flags.has("plant") && <Plant x={-1.35} z={-0.7} />}
          {flags.has("poster") && (
            <>
              <Flat size={[0.5, 0.7]} at={[-0.9, 2.1, WALL_Z]} color={C.rust} />
              <Flat size={[0.3, 0.3]} at={[-0.9, 2.15, WALL_Z + 0.01]} color={C.mustard} />
            </>
          )}
          {flags.has("rug") && <Box size={[1.8, 0.02, 1.0]} at={[-0.2, 0.01, 0.25]} color="#f08aa8" />}
          {flags.has("trophy") && (
            <>
              <Cyl r={[0.1, 0.05]} h={0.16} at={[-2.05, 1.98, -0.8]} color="#e8b931" />
              <Box size={[0.16, 0.05, 0.12]} at={[-2.05, 1.84, -0.8]} color={C.ink} />
            </>
          )}
          {flags.has("fishbowl") && (
            <>
              <Box size={[0.36, 0.5, 0.36]} at={[2.2, 0.25, -0.7]} color={C.woodDark} />
              <Gem r={0.2} at={[2.2, 0.68, -0.7]} color="#bfe3f2" />
              <Box size={[0.1, 0.06, 0.03]} at={[2.2, 0.66, -0.52]} color="#f08a24" />
            </>
          )}
          {flags.has("pudding") && (
            <>
              <Cyl r={[0.09, 0.07]} h={0.12} at={[-2.35, 1.87, -0.8]} color="#f2d34a" />
              <Cyl r={0.075} h={0.03} at={[-2.35, 1.945, -0.8]} color="#7a4a22" />
            </>
          )}
          {flags.has("cake") && (
            <>
              <Cyl r={0.14} h={0.16} at={[-1.75, 1.89, -0.8]} color={C.plate} sides={8} />
              <Cyl r={0.145} h={0.04} at={[-1.75, 1.9, -0.8]} color="#f08aa8" sides={8} />
              <Box size={[0.03, 0.08, 0.03]} at={[-1.75, 2.01, -0.8]} color="#d4265f" />
            </>
          )}
          {flags.has("mic") && (
            <>
              <Cyl r={[0.03, 0.022]} h={0.22} at={[1.62, 0.6, 0.02]} color={C.ink} rot={[0, 0, R]} />
              <Gem r={0.06} at={[1.49, 0.6, 0.02]} color={C.metal} />
            </>
          )}
          {flags.has("frame") && (
            <>
              <Flat size={[0.5, 0.4]} at={[1.35, 2.15, WALL_Z]} color={C.woodDark} />
              <Flat size={[0.4, 0.3]} at={[1.35, 2.15, WALL_Z + 0.01]} color="#bfe3f2" />
              <Flat size={[0.06, 0.12]} at={[1.27, 2.1, WALL_Z + 0.02]} color={C.rust} />
              <Flat size={[0.06, 0.12]} at={[1.43, 2.1, WALL_Z + 0.02]} color="#f08a24" />
            </>
          )}
          {flags.has("lamp") && (
            <>
              <Box size={[0.04, 1.1, 0.04]} at={[0.1, 0.55, -0.9]} color={C.ink} />
              <Box size={[0.24, 0.03, 0.24]} at={[0.1, 0.015, -0.9]} color={C.ink} />
              <Cyl r={[0.12, 0.18]} h={0.2} at={[0.1, 1.18, -0.9]} color={evening ? C.lampOn : C.lampOff} />
            </>
          )}
          {flags.has("gamepad") && (
            <>
              <Box size={[0.24, 0.05, 0.12]} at={[-0.1, 0.035, 0.55]} color={C.ink} rot={[0, 0.3, 0]} />
              <Box size={[0.04, 0.02, 0.04]} at={[-0.04, 0.07, 0.53]} color="#d4265f" rot={[0, 0.3, 0]} />
            </>
          )}
          {flags.has("dumbbell") && (
            <>
              <Cyl r={0.025} h={0.36} at={[-1.6, 0.06, 0.35]} color={C.metal} rot={[0, 0, R]} />
              {[-1, 1].map((sd) => (
                <Cyl key={sd} r={0.07} h={0.08} at={[-1.6 + 0.15 * sd, 0.07, 0.35]} color={C.ink} rot={[0, 0, R]} sides={8} />
              ))}
            </>
          )}
          {(flags.has("ramen") || flags.has("camera") || flags.has("coffee")) && <Box size={[0.9, 0.04, 0.2]} at={[1.35, 1.62, WALL_Z + 0.12]} color={C.wood} />}
          {flags.has("ramen") && (
            <>
              <Cyl r={[0.07, 0.055]} h={0.13} at={[1.05, 1.705, WALL_Z + 0.12]} color="#d4265f" sides={8} />
              <Cyl r={0.072} h={0.02} at={[1.05, 1.78, WALL_Z + 0.12]} color={C.plate} sides={8} />
            </>
          )}
          {flags.has("camera") && (
            <>
              <Box size={[0.2, 0.12, 0.08]} at={[1.35, 1.7, WALL_Z + 0.12]} color={C.ink} />
              <Cyl r={0.04} h={0.04} at={[1.35, 1.7, WALL_Z + 0.18]} color={C.metal} rot={[R, 0, 0]} sides={8} />
            </>
          )}
          {flags.has("coffee") && (
            <>
              <Cyl r={0.05} h={0.1} at={[1.65, 1.69, WALL_Z + 0.12]} color={C.teal} sides={8} />
              <Box size={[0.03, 0.05, 0.02]} at={[1.71, 1.69, WALL_Z + 0.12]} color={C.teal} />
            </>
          )}
          {flags.has("vase") && (
            <>
              <Box size={[0.32, 0.03, 0.14]} at={[-0.1, 1.64, WALL_Z + 0.07]} color={C.wood} />
              <Cyl r={[0.05, 0.065]} h={0.14} at={[-0.1, 1.725, WALL_Z + 0.08]} color="#bfe3f2" sides={8} />
              {[
                [-0.16, "#f08aa8"],
                [-0.1, "#d4265f"],
                [-0.04, "#f08aa8"],
              ].map(([x, color]) => (
                <Gem key={String(x)} r={0.045} at={[x as number, 1.86, WALL_Z + 0.08]} color={color as string} />
              ))}
            </>
          )}
          {flags.has("mirror") && (
            <>
              <Flat size={[0.32, 0.55]} at={[2.2, 1.55, WALL_Z + 0.01]} color={C.woodDark} />
              <Flat size={[0.24, 0.47]} at={[2.2, 1.55, WALL_Z + 0.02]} color="#d8eef6" />
              <Flat size={[0.04, 0.2]} at={[2.14, 1.62, WALL_Z + 0.03]} color="#ffffff" />
            </>
          )}
          {flags.has("mirrorball") && (
            <>
              <Box size={[0.03, 0.4, 0.03]} at={[0.3, 3.0, -0.4]} color={C.ink} />
              <Gem r={0.14} at={[0.3, 2.72, -0.4]} color="#c9d3d8" />
              <Box size={[0.05, 0.05, 0.01]} at={[0.26, 2.75, -0.27]} color="#ffffff" />
            </>
          )}
          {flags.has("guitar") && (
            <group position={[-0.42, 0, -1.0]} rotation={[0, 0, -0.12]}>
              <Gem r={0.2} at={[0, 0.28, 0]} color="#f08a24" scale={[1, 1.2, 0.4]} />
              <Gem r={0.06} at={[0, 0.3, 0.07]} color={C.ink} scale={[1, 1, 0.4]} />
              <Box size={[0.06, 0.6, 0.04]} at={[0, 0.78, 0]} color={C.woodDark} />
              <Box size={[0.1, 0.12, 0.05]} at={[0, 1.12, 0]} color={C.ink} />
            </group>
          )}
          {flags.has("lights") && (
            <>
              <Flat size={[5.0, 0.015]} at={[0, 2.82, WALL_Z + 0.02]} color={C.ink} />
              {Array.from({ length: 13 }, (_, i) => (
                <Gem key={i} r={0.04} at={[-2.4 + i * 0.4, 2.76, WALL_Z + 0.04]} color={["#ffd27a", "#f08aa8", "#8fd3f4", "#a6e38f"][i % 4]} />
              ))}
            </>
          )}
          {flags.has("beanbag") && <Gem r={0.3} at={[1.95, 0.17, 0.4]} color="#f08a24" scale={[1.1, 0.6, 1]} />}
          {flags.has("clock") && (
            <>
              <Cyl r={0.17} h={0.04} at={[2.2, 2.35, WALL_Z + 0.02]} color={C.ink} sides={10} rot={[R, 0, 0]} />
              <Cyl r={0.14} h={0.04} at={[2.2, 2.35, WALL_Z + 0.03]} color={C.paper} sides={10} rot={[R, 0, 0]} />
              <Box size={[0.02, 0.09, 0.01]} at={[2.2, 2.39, WALL_Z + 0.06]} color={C.ink} />
              <Box size={[0.07, 0.02, 0.01]} at={[2.23, 2.35, WALL_Z + 0.06]} color={C.ink} />
            </>
          )}
        </>
      );
    },
  },

  plane: {
    label: "비행기 안",
    wall: SET_WALLS.plane,
    me: { x: -0.9, facing: 0.5, posture: "sit" },
    partner: { x: 0.85, facing: -0.55, posture: "stand" },
    // 창가 좌석에 내가 앉고, 통로에 승무원이나 다른 승객이 선다
    Scenery: ({ evening }) => (
      <>
        {[-2.1, -1.3, -0.5, 0.3, 1.1, 1.9].map((x) => (
          <group key={x}>
            <Flat size={[0.34, 0.44]} at={[x, 1.55, WALL_Z]} color="#8c9296" />
            <Flat size={[0.26, 0.36]} at={[x, 1.55, WALL_Z + 0.01]} color={evening ? C.night : "#bfe3f2"} />
          </group>
        ))}
        <Box size={[5.6, 0.42, 0.6]} at={[0, 2.62, -0.85]} color="#efece5" />
        <Box size={[5.6, 0.05, 0.62]} at={[0, 2.38, -0.85]} color="#b9b4a9" />
        <Glow size={[0.22, 0.08, 0.02]} at={[0.0, 2.3, -0.54]} on />
        <Seat x={-1.65} facing={0.5} seat={C.navy} back={C.navy} head={C.plate} />
        <Seat x={-0.9} facing={0.5} seat={C.navy} back={C.navy} head={C.plate} />
        <Box size={[0.5, 0.85, 0.62]} at={[1.8, 0.43, -0.25]} color="#c3c9cc" />
        <Box size={[0.54, 0.05, 0.66]} at={[1.8, 0.88, -0.25]} color={C.metal} />
        {[-0.12, 0.12].map((dz) => (
          <Cyl key={dz} r={0.05} h={0.1} at={[1.72, 0.96, -0.25 + dz]} color={C.plate} />
        ))}
      </>
    ),
  },

  subway: {
    label: "지하철 안",
    wall: SET_WALLS.subway,
    me: { x: -0.8, facing: 0.5, posture: "sit" },
    partner: { x: 0.85, facing: -0.5, posture: "stand" },
    // 긴 의자에 내가 앉고, 손잡이를 잡고 선 사람이 앞에 있다. 창밖은 늘 어두운 터널이다
    Scenery: () => (
      <>
        {[-1.7, 0, 1.7].map((x) => (
          <group key={x}>
            <Flat size={[1.3, 0.62]} at={[x, 1.72, WALL_Z]} color="#2b3350" />
            <Flat size={[0.9, 0.03]} at={[x - 0.1, 1.78, WALL_Z + 0.01]} color="#7e88a8" />
            <Flat size={[0.5, 0.03]} at={[x + 0.2, 1.62, WALL_Z + 0.01]} color="#7e88a8" />
          </group>
        ))}
        <Flat size={[5.2, 0.16]} at={[0, 2.3, WALL_Z + 0.01]} color={C.paper} />
        {[-2.0, -1.0, 0.0, 1.0, 2.0].map((x, i) => (
          <Gem key={x} r={0.035} at={[x, 2.3, WALL_Z + 0.03]} color={["#2f9e44", "#3f73c9", "#f08a24", "#2f9e44", "#d4265f"][i]} />
        ))}
        <Box size={[2.3, 0.1, 0.5]} at={[-1.15, 0.48, 0]} color="#5b8fb0" />
        <Box size={[2.3, 0.6, 0.1]} at={[-1.15, 0.85, -0.28]} color="#4a7a99" />
        <Box size={[5.4, 0.03, 0.03]} at={[0, 2.62, -0.25]} color={C.metal} />
        {[-1.6, -0.6, 0.4, 1.4].map((x) => (
          <group key={x}>
            <Box size={[0.02, 0.22, 0.02]} at={[x, 2.5, -0.25]} color={C.plate} />
            <Cyl r={0.06} h={0.02} at={[x, 2.36, -0.25]} color={C.plate} rot={[R, 0, 0]} />
          </group>
        ))}
        <Cyl r={0.03} h={2.6} at={[0.25, 1.3, -0.3]} color={C.metal} />
        <Cyl r={0.03} h={2.6} at={[2.0, 1.3, -0.3]} color={C.metal} />
      </>
    ),
  },

  classroom: {
    label: "교실",
    wall: SET_WALLS.classroom,
    me: { x: -0.8, facing: 0.5, posture: "sit" },
    partner: { x: 0.9, facing: -0.55, posture: "stand" },
    // 책상에 내가 앉아 있고, 선생님이나 친구가 옆에 선다. 칠판 위에는 시계, 책상 위에는 시험지가 있다
    Scenery: ({ evening }) => (
      <>
        <Flat size={[2.8, 1.2]} at={[0.4, 1.75, WALL_Z]} color={C.woodDark} />
        <Flat size={[2.6, 1.02]} at={[0.4, 1.75, WALL_Z + 0.01]} color="#2f5d4a" />
        {[
          [0.0, 2.0, 1.1],
          [0.2, 1.8, 0.7],
          [-0.05, 1.6, 0.9],
        ].map(([x, y, w]) => (
          <Flat key={y} size={[w, 0.03]} at={[x, y, WALL_Z + 0.02]} color="#e8eee9" />
        ))}
        <Box size={[2.6, 0.05, 0.08]} at={[0.4, 1.2, -1.08]} color={C.woodDark} />
        <Cyl r={0.17} h={0.04} at={[-1.6, 2.45, WALL_Z + 0.02]} color={C.ink} sides={10} rot={[R, 0, 0]} />
        <Cyl r={0.14} h={0.04} at={[-1.6, 2.45, WALL_Z + 0.03]} color={C.paper} sides={10} rot={[R, 0, 0]} />
        <Window x={-2.3} y={1.8} w={0.7} h={0.9} evening={evening} />
        <Seat x={-0.8} facing={0.5} seat={C.wood} back={C.wood} />
        <Box size={[0.72, 0.05, 0.46]} at={[-0.45, 0.76, 0.42]} color={C.wood} rot={[0, 0.5, 0]} />
        {[
          [-0.72, 0.3],
          [-0.18, 0.62],
        ].map(([x, z]) => (
          <Box key={x} size={[0.05, 0.74, 0.05]} at={[x, 0.37, z]} color={C.metal} />
        ))}
        <Box size={[0.3, 0.012, 0.22]} at={[-0.45, 0.79, 0.42]} color={C.plate} rot={[0, 0.5, 0]} />
      </>
    ),
    decor: [{ id: "mochi", x: 2.35 }],
  },

  clinic: {
    label: "동네 의원 · 진료실",
    wall: SET_WALLS.clinic,
    me: { x: -0.85, facing: R, posture: "sit" },
    partner: { x: 0.95, facing: -R, posture: "sit" },
    // 환자인 내가 둥근 의자에 앉고, 의사가 책상 앞 의자에 앉는다. 벽에는 시력표, 책상에는 모니터가 있다
    Scenery: ({ evening }) => (
      <>
        <Window x={-2.15} y={1.9} w={0.7} h={0.9} evening={evening} blinds />
        <Flat size={[0.42, 0.66]} at={[0.05, 2.45, WALL_Z]} color={C.paper} />
        {[0.26, 0.19, 0.13, 0.09, 0.05].map((w, i) => (
          <Flat key={i} size={[w, 0.045]} at={[0.05, 2.66 - i * 0.11, WALL_Z + 0.01]} color={C.ink} />
        ))}
        <Box size={[1.1, 0.06, 0.6]} at={[1.75, 0.76, -0.6]} color={C.plate} />
        <Box size={[1.1, 0.72, 0.05]} at={[1.75, 0.38, -0.88]} color="#d9dcd6" />
        <Box size={[0.5, 0.36, 0.05]} at={[1.85, 1.1, -0.75]} color={C.ink} />
        <Box size={[0.42, 0.28, 0.02]} at={[1.85, 1.1, -0.72]} color="#9fd3e8" />
        <Box size={[0.08, 0.16, 0.08]} at={[1.85, 0.86, -0.75]} color={C.ink} />
        <Seat x={0.95} facing={-R} seat={C.navy} back={C.navy} />
        <Cyl r={0.24} h={0.08} at={[-0.85, 0.46, 0]} color={C.teal} />
        <Cyl r={0.04} h={0.42} at={[-0.85, 0.21, 0]} color={C.metal} />
        <Box size={[0.7, 1.5, 0.4]} at={[-1.6, 0.75, -0.85]} color={C.plate} />
        <Flat size={[0.16, 0.05]} at={[-1.6, 1.25, -0.64]} color={C.teal} />
        <Flat size={[0.05, 0.16]} at={[-1.6, 1.25, -0.63]} color={C.teal} />
      </>
    ),
    decor: [{ id: "calendar", x: -1.6, y: 2.25 }],
  },

  pharmacy: {
    label: "약국 · 계산대",
    wall: SET_WALLS.pharmacy,
    me: { x: -0.95, facing: R, posture: "stand" },
    partner: { x: 1.0, z: -0.65, facing: -R, posture: "stand" },
    // 편의점과 같은 자리 배치에, 뒤 선반에는 약 상자가 줄지어 있고 벽에는 초록 십자 간판이 있다
    Scenery: () => (
      <>
        <Flat size={[0.46, 0.14]} at={[-1.75, 2.55, WALL_Z + 0.01]} color="#2f9e44" />
        <Flat size={[0.14, 0.46]} at={[-1.75, 2.55, WALL_Z + 0.02]} color="#2f9e44" />
        <Box size={[2.6, 1.9, 0.3]} at={[1.0, 1.0, -1.0]} color="#d9ddd6" />
        {[0.53, 1.03, 1.53, 2.0].map((y) => (
          <Box key={y} size={[2.6, 0.05, 0.34]} at={[1.0, y, -0.8]} color={C.woodDark} />
        ))}
        {[0.55, 1.05, 1.55].map((y, row) =>
          [0.0, 0.32, 0.64, 0.96, 1.28, 1.6, 1.92].map((x, i) => (
            <Box key={`${y}-${x}`} size={[0.22, 0.26, 0.12]} at={[x, y + 0.13, -0.78]} color={["#3f73c9", C.paper, "#2f9e44", "#f08a24", C.paper][(i + row) % 5]} />
          )),
        )}
        <Box size={[1.4, 1.0, 0.6]} at={[0.75, 0.5, 0]} color="#f3f1ea" />
        <Flat size={[1.4, 0.1]} at={[0.75, 0.8, 0.31]} color="#2f9e44" />
        <Box size={[0.2, 0.14, 0.14]} at={[0.35, 1.07, 0.1]} color={C.paper} />
        <Box size={[0.32, 0.22, 0.28]} at={[1.15, 1.11, -0.1]} color={C.ink} />
      </>
    ),
  },

  bunsik: {
    label: "분식집 · 주방 앞",
    wall: SET_WALLS.bunsik,
    me: { x: -0.95, facing: R, posture: "stand" },
    partner: { x: 1.0, z: -0.65, facing: -R, posture: "stand" },
    // 벽 위쪽에 메뉴판이 줄지어 있고, 계산대 위 큰 판에서 떡볶이가 끓는다
    Scenery: () => (
      <>
        <Flat size={[5.4, 0.5]} at={[0, 2.7, WALL_Z + 0.01]} color={C.ink} />
        {[-2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1].map((x, i) => (
          <Flat key={x} size={[0.56, 0.36]} at={[x, 2.7, WALL_Z + 0.02]} color={[C.mustard, C.paper, "#f08aa8", C.paper, C.mustard, C.paper, "#f08aa8"][i]} />
        ))}
        <Box size={[1.6, 1.0, 0.6]} at={[0.75, 0.5, 0]} color={C.wood} />
        <Box size={[1.6, 0.06, 0.62]} at={[0.75, 1.02, 0]} color={C.metal} />
        <Cyl r={0.36} h={0.08} at={[0.55, 1.1, 0.02]} color={C.ink} sides={10} />
        <Cyl r={0.31} h={0.04} at={[0.55, 1.15, 0.02]} color="#d4265f" sides={10} />
        {[-0.12, 0.05, 0.17].map((dx, i) => (
          <Box key={dx} size={[0.12, 0.04, 0.04]} at={[0.55 + dx, 1.18, i * 0.08 - 0.06]} color="#f3a3a3" rot={[0, i, 0]} />
        ))}
        <Cyl r={0.17} h={0.06} at={[-1.65, 0.62, 0]} color="#d4265f" />
        <Cyl r={0.04} h={0.6} at={[-1.65, 0.3, 0]} color={C.metal} />
        <Box size={[0.5, 1.6, 0.35]} at={[2.2, 0.8, -0.85]} color={C.metal} />
        <Flat size={[0.36, 1.3]} at={[2.2, 0.85, -0.67]} color="#cfe8f0" />
      </>
    ),
    decor: [{ id: "mochi", x: -2.3 }],
  },

  salon: {
    label: "미용실 · 거울 앞",
    wall: SET_WALLS.salon,
    me: { x: -0.85, facing: R, posture: "sit" },
    partner: { x: 0.85, facing: -R, posture: "stand" },
    // 손님인 내가 미용 의자에 앉고 미용사가 옆에 선다. 벽에는 조명이 둘린 큰 거울, 선반에는 병들이 있다
    Scenery: () => (
      <>
        <Flat size={[1.3, 1.5]} at={[-0.85, 1.75, WALL_Z]} color={C.ink} />
        <Flat size={[1.16, 1.36]} at={[-0.85, 1.75, WALL_Z + 0.01]} color="#cfdfe6" />
        <Box size={[0.6, 0.04, 0.01]} at={[-1.05, 2.2, WALL_Z + 0.02]} color={C.paper} rot={[0, 0, 0.5]} />
        {[2.5, 2.2, 1.9, 1.6, 1.3].map((y) => (
          <Glow key={y} size={[0.06, 0.06, 0.02]} at={[-1.48, y, WALL_Z + 0.02]} on />
        ))}
        <Seat x={-0.85} facing={R} seat={C.ink} back={C.ink} head={C.ink} />
        <Box size={[0.9, 0.05, 0.3]} at={[1.75, 1.35, -0.95]} color={C.wood} />
        {[1.42, 1.6, 1.78, 1.96].map((x, i) => (
          <Cyl key={x} r={0.06} h={0.22 + (i % 2) * 0.08} at={[x, 1.49 + (i % 2) * 0.04, -0.95]} color={["#f08aa8", C.teal, C.mustard, C.paper][i]} />
        ))}
        <Box size={[0.5, 0.75, 0.4]} at={[1.85, 0.38, -0.7]} color="#e7e1d8" />
      </>
    ),
    decor: [{ id: "poster", x: 2.2, y: 2.3 }],
  },

  boutique: {
    label: "옷가게",
    wall: SET_WALLS.boutique,
    me: { x: -0.7, facing: R, posture: "stand" },
    partner: { x: 0.7, facing: -R, posture: "stand" },
    // 뒤쪽에 옷이 걸린 행거와 탈의실 커튼이 있다
    Scenery: () => (
      <>
        <Box size={[2.2, 0.04, 0.04]} at={[-1.3, 1.95, -0.75]} color={C.metal} />
        {[-2.3, -0.3].map((x) => (
          <Box key={x} size={[0.04, 1.95, 0.04]} at={[x, 0.98, -0.75]} color={C.metal} />
        ))}
        {[-2.1, -1.8, -1.5, -1.2, -0.9, -0.6].map((x, i) => (
          <group key={x}>
            <Box size={[0.24, 0.6, 0.1]} at={[x, 1.6, -0.75]} color={["#f08aa8", C.navy, C.mustard, C.teal, C.paper, C.rust][i]} />
            <Box size={[0.34, 0.12, 0.1]} at={[x, 1.86, -0.75]} color={["#f08aa8", C.navy, C.mustard, C.teal, C.paper, C.rust][i]} />
          </group>
        ))}
        <Box size={[1.1, 2.4, 0.06]} at={[1.85, 1.2, -1.0]} color={C.ink} />
        <Flat size={[0.95, 2.2]} at={[1.85, 1.15, -0.96]} color="#b5546b" />
        {[1.5, 1.7, 1.9, 2.1, 2.3].map((x) => (
          <Flat key={x} size={[0.02, 2.2]} at={[x - 0.1, 1.15, -0.95]} color="#8f3d52" />
        ))}
      </>
    ),
    decor: [{ id: "mochi", x: 0.35, z: -0.6 }],
  },

  market: {
    label: "플리마켓 · 노점",
    wall: SET_WALLS.market,
    me: { x: -0.95, facing: R, posture: "stand" },
    partner: { x: 1.0, z: -0.65, facing: -R, posture: "stand" },
    // 줄무늬 천막 아래 접이식 탁자에 잡동사니가 놓인 노점. 저녁이면 줄 전구가 켜지고, sold는 탁자에 SOLD 팻말을 세운다
    Scenery: ({ evening, flags }) => (
      <>
        <Box size={[30, 0.02, 2.4]} at={[0, 0.01, 0]} color="#8d8880" />
        <Box size={[2.2, 1.6, 0.1]} at={[-2.3, 0.97, -1.05]} color="#5f9e96" />
        {[-3.0, -2.6, -2.2, -1.8].map((x, i) => (
          <Box key={x} size={[0.4, 0.14, 0.5]} at={[x + 0.2, 1.7, -0.9]} color={i % 2 ? C.paper : C.teal} />
        ))}
        {[-0.3, 2.3].map((x) => (
          <Cyl key={x} r={0.03} h={2.3} at={[x, 1.15, -0.4]} color={C.metal} />
        ))}
        {[-0.3, 0.07, 0.44, 0.81, 1.18, 1.55, 1.92].map((x, i) => (
          <Box key={x} size={[0.37, 0.12, 1.0]} at={[x + 0.185, 2.32, -0.4]} color={i % 2 ? C.paper : "#d9483b"} rot={[0.12, 0, 0]} />
        ))}
        {[0, 0.37, 0.74, 1.11, 1.48, 1.85].map((x, i) => (
          <Box key={x} size={[0.37, 0.16, 0.02]} at={[x + 0.185 - 0.3, 2.18, 0.1]} color={i % 2 ? "#d9483b" : C.paper} />
        ))}
        {[-2.6, -1.9, -1.2, -0.5, 0.2, 0.9, 1.6, 2.3].map((x) => (
          <Gem key={x} r={0.045} at={[x, 2.75 - Math.abs(Math.sin(x * 2)) * 0.12, -0.95]} color={evening ? C.lampOn : C.lampOff} />
        ))}
        <Box size={[2.0, 0.05, 0.7]} at={[1.0, 0.95, 0]} color="#e9e5dc" />
        <Box size={[2.0, 0.9, 0.01]} at={[1.0, 0.48, 0.35]} color="#3f6f8f" />
        {[0.02, 1.98].map((x) => (
          <Box key={x} size={[0.01, 0.9, 0.7]} at={[x, 0.48, 0]} color="#36607c" />
        ))}
        <Cyl r={[0.04, 0.12]} h={0.2} at={[0.35, 1.08, -0.05]} color={C.mustard} />
        <Cyl r={0.015} h={0.16} at={[0.35, 1.26, -0.05]} color={C.ink} />
        <Box size={[0.3, 0.2, 0.22]} at={[0.8, 1.07, 0.05]} color={C.navy} />
        <Box size={[0.22, 0.05, 0.3]} at={[1.25, 1.00, 0.05]} color={C.rust} />
        <Box size={[0.22, 0.05, 0.3]} at={[1.27, 1.05, 0.05]} color={C.mustard} />
        <Cyl r={[0.06, 0.09]} h={0.26} at={[1.7, 1.11, 0]} color="#7fc8b8" sides={8} />
        {[0.55, 1.05, 1.5].map((x) => (
          <Box key={x} size={[0.1, 0.06, 0.005]} at={[x, 0.82, 0.36]} color={C.mustard} />
        ))}
        {flags.has("sold") && (
          <>
            <Box size={[0.62, 0.3, 0.02]} at={[1.0, 1.22, 0.3]} color={C.paper} rot={[-0.15, 0, 0]} />
            <PixelText text="SOLD" at={[1.0, 1.22, 0.315]} px={0.024} color="#c92a2a" />
          </>
        )}
      </>
    ),
    decor: [{ id: "junk-box", x: 2.5, z: 0.2 }],
  },
  studio: {
    label: "크리에이터 방 · 촬영 중",
    wall: SET_WALLS.studio,
    me: { x: -0.7, facing: R, posture: "stand" },
    partner: { x: 0.7, facing: -R, posture: "stand" },
    // 흡음재 벽, ON AIR 간판, 모니터 책상이 있는 촬영 방. live면 간판이 빨갛게 켜진다
    Scenery: ({ evening, flags }) => (
      <>
        {[-2.7, -2.25, -1.8, 1.8, 2.25, 2.7].flatMap((x) =>
          [1.2, 1.65, 2.1, 2.55].map((y) => <Flat key={`${x}-${y}`} size={[0.4, 0.4]} at={[x, y, WALL_Z + 0.01]} color={(x + y) % 0.9 > 0.45 ? "#3b3550" : "#4a4362"} />),
        )}
        <Flat size={[1.4, 0.42]} at={[0, 2.7, WALL_Z + 0.02]} color={flags.has("live") ? "#c92a2a" : "#5a5268"} />
        <PixelText text="ON AIR" at={[0, 2.7, WALL_Z + 0.03]} px={0.035} color={flags.has("live") ? "#fff0f0" : "#8d86a0"} />
        <Box size={[1.6, 0.06, 0.6]} at={[0, 0.78, -0.85]} color={C.woodDark} />
        {[-0.75, 0.75].map((x) => (
          <Box key={x} size={[0.05, 0.76, 0.5]} at={[x, 0.38, -0.85]} color={C.ink} />
        ))}
        <Box size={[0.9, 0.52, 0.05]} at={[0.25, 1.17, -1.0]} color={C.ink} />
        <Flat size={[0.82, 0.44]} at={[0.25, 1.17, -0.97]} color={evening ? "#5a8fb0" : "#9fd3e8"} />
        <Box size={[0.08, 0.14, 0.08]} at={[0.25, 0.88, -1.0]} color={C.ink} />
        <Cyl r={0.025} h={0.45} at={[-0.5, 1.0, -0.9]} color={C.ink} rot={[0, 0, 0.5]} />
        <Cyl r={[0.06, 0.05]} h={0.16} at={[-0.38, 1.22, -0.85]} color="#3a3a38" />
        <Box size={[0.5, 0.06, 0.3]} at={[-0.2, 0.84, -0.75]} color="#2b2b2a" />
      </>
    ),
    decor: [
      { id: "ring-light", x: -2.3 },
      { id: "tripod-cam", x: 2.3 },
    ],
  },
  street: {
    label: "거리 · 헤어질 때",
    wall: SET_WALLS.street,
    me: { x: -0.7, facing: R, posture: "stand" },
    partner: { x: 0.7, facing: -R, posture: "stand" },
    Scenery: ({ evening }) => (
      <>
        <Box size={[3.4, 3.3, 0.2]} at={[-1.0, 1.65, -1.0]} color={evening ? "#7a3f2b" : C.brick} />
        <Box size={[0.7, 1.3, 0.05]} at={[-1.6, 0.65, -0.88]} color={C.ink} />
        {[-0.6, 0.2].map((x) => (
          <Box key={x} size={[0.5, 0.6, 0.05]} at={[x, 2.2, -0.88]} color={evening ? C.lampOn : C.sky} />
        ))}
        <Box size={[30, 0.08, 0.3]} at={[0, 0.04, 0.9]} color="#77726b" />
        <Cyl r={0.04} h={2.7} at={[1.9, 1.35, -0.4]} color={C.ink} />
        <Box size={[0.36, 0.14, 0.22]} at={[1.78, 2.7, -0.4]} color={C.ink} />
        <Glow size={[0.24, 0.04, 0.16]} at={[1.78, 2.62, -0.4]} on={evening} />
      </>
    ),
    decor: [
      { id: "poster", x: 0.02, y: 1.25, z: -0.87 },
      { id: "parcel", x: -2.25, z: -0.7 },
      { id: "mochi", x: 2.35, z: 0.3 },
    ],
  },
};
