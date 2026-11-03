"use client";

import { C } from "./palette";
import { Box, Cyl, Flat, Gem, PixelText } from "./primitives";
import type { Decor, DecorId } from "./types";
import { PixOval, PixRect } from "./wear";

// 무대에 붙이는 소품 스티커. 세트마다 기본으로 몇 개씩 놓이고, 장면 JSON의 stage.decor에 id와 x만 적으면 더 붙는다.
// 벽에 거는 것은 (x, y)가 가운데, 바닥이나 가구 위에 두는 것은 (x, y)가 밑면 가운데다. y·z를 비우면 소품마다 정한 기본 자리에 놓인다
const R = Math.PI / 2;
// 세트의 벽(-1.15)보다 조금 앞에 붙여서 벽 그림과 겹쳐 깜빡이지 않게 한다
const WALL = -1.12;
const FUR = "#f0a24a";

type At = { x: number; y: number; z: number };

// 소품마다 기본 높이와 깊이. 벽 소품은 벽에, 바닥 소품은 벽 앞 바닥에 놓인다
const DEFAULTS: Record<DecorId, { y: number; z: number }> = {
  fridge: { y: 0, z: -0.8 },
  postit: { y: 1.7, z: WALL },
  calendar: { y: 2.15, z: WALL },
  picture: { y: 2.1, z: WALL },
  poster: { y: 2.05, z: WALL },
  whiteboard: { y: 1.9, z: WALL },
  menu: { y: 2.35, z: WALL },
  notice: { y: 1.75, z: WALL },
  aircon: { y: 2.75, z: WALL },
  multitap: { y: 0, z: -0.95 },
  cabinet: { y: 0, z: -0.85 },
  "rice-cooker": { y: 0.7, z: -0.85 },
  "shopping-bag": { y: 0, z: -0.2 },
  soju: { y: 0, z: 0.2 },
  "cup-ramen": { y: 0, z: 0.2 },
  parcel: { y: 0, z: -0.85 },
  "umbrella-stand": { y: 0, z: -0.8 },
  fan: { y: 0, z: -0.85 },
  tissue: { y: 0, z: 0.2 },
  mug: { y: 0, z: 0.2 },
  papers: { y: 0, z: 0 },
  slippers: { y: 0, z: 0.35 },
  tambourine: { y: 0, z: 0 },
  mochi: { y: 0, z: -0.5 },
  pudding: { y: 0, z: 0 },
  "contest-poster": { y: 2.0, z: WALL },
  "bill-pile": { y: 0, z: 0.1 },
  "ice-block": { y: 0, z: -0.55 },
  "snow-pile": { y: 0, z: -0.3 },
  thermometer: { y: 2.0, z: WALL },
  "tripod-cam": { y: 0, z: 0.25 },
  "ring-light": { y: 0, z: -0.5 },
  "massage-chair": { y: 0, z: -0.55 },
  scooter: { y: 0, z: -0.45 },
  "junk-box": { y: 0, z: 0.15 },
  "sale-sign": { y: 0, z: 0.3 },
  "trade-sign": { y: 0, z: 0.3 },
};

function Fridge({ x, y, z }: At) {
  const front = z + 0.255;
  return (
    <>
      <Box size={[0.66, 1.8, 0.5]} at={[x, y + 0.9, z]} color="#e9e7e1" />
      <Box size={[0.66, 0.025, 0.01]} at={[x, y + 1.22, front]} color="#9a9a96" />
      <Box size={[0.035, 0.28, 0.03]} at={[x - 0.26, y + 1.42, front + 0.015]} color={C.metal} />
      <Box size={[0.035, 0.42, 0.03]} at={[x - 0.26, y + 0.92, front + 0.015]} color={C.metal} />
      {/* 냉장고 문에 붙은 포스트잇과 자석 */}
      <Box size={[0.15, 0.15, 0.005]} at={[x + 0.1, y + 0.98, front + 0.005]} color="#f6e27a" />
      <Box size={[0.1, 0.018, 0.005]} at={[x + 0.1, y + 1.0, front + 0.01]} color="#8a7a3a" />
      <Box size={[0.06, 0.06, 0.02]} at={[x + 0.18, y + 1.5, front + 0.01]} color={C.rust} />
      <Box size={[0.06, 0.06, 0.02]} at={[x - 0.04, y + 1.56, front + 0.01]} color={C.teal} />
    </>
  );
}

function PostIt({ x, y, z }: At) {
  return (
    <group position={[x, y, z]} rotation={[0, 0, 0.12]}>
      <Flat size={[0.17, 0.17]} at={[0, 0, 0]} color="#f6e27a" />
      <Flat size={[0.11, 0.02]} at={[0, 0.03, 0.005]} color="#8a7a3a" />
      <Flat size={[0.07, 0.02]} at={[-0.02, -0.02, 0.005]} color="#8a7a3a" />
    </group>
  );
}

function Calendar({ x, y, z }: At) {
  return (
    <>
      <Flat size={[0.42, 0.52]} at={[x, y, z]} color={C.paper} />
      <Flat size={[0.42, 0.11]} at={[x, y + 0.205, z + 0.005]} color={C.rust} />
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2, 3].map((c) => <Flat key={`${r}-${c}`} size={[0.05, 0.04]} at={[x - 0.135 + c * 0.09, y + 0.07 - r * 0.1, z + 0.005]} color="#b9b6ae" />),
      )}
      {/* 약속 있는 날에 친 동그라미 */}
      <Flat size={[0.08, 0.07]} at={[x + 0.135, y - 0.13, z + 0.008]} color={C.rust} />
    </>
  );
}

function Picture({ x, y, z }: At) {
  return (
    <>
      <Flat size={[0.62, 0.46]} at={[x, y, z]} color={C.woodDark} />
      <Flat size={[0.52, 0.36]} at={[x, y, z + 0.005]} color="#9fd3e8" />
      <Flat size={[0.08, 0.08]} at={[x + 0.15, y + 0.08, z + 0.01]} color={C.mustard} />
      <Flat size={[0.52, 0.1]} at={[x, y - 0.13, z + 0.01]} color={C.leaf} />
      <Flat size={[0.3, 0.08]} at={[x - 0.08, y - 0.05, z + 0.01]} color="#5f8a57" />
      <Flat size={[0.12, 0.06]} at={[x - 0.08, y + 0.02, z + 0.01]} color="#5f8a57" />
    </>
  );
}

function Poster({ x, y, z }: At) {
  return (
    <>
      <Flat size={[0.44, 0.62]} at={[x, y, z]} color={C.navy} />
      <Flat size={[0.3, 0.3]} at={[x, y + 0.08, z + 0.005]} color={C.mustard} />
      <Flat size={[0.14, 0.14]} at={[x, y + 0.08, z + 0.01]} color={C.rust} />
      <Flat size={[0.34, 0.05]} at={[x, y - 0.16, z + 0.005]} color={C.paper} />
      <Flat size={[0.22, 0.03]} at={[x, y - 0.23, z + 0.005]} color={C.paper} />
    </>
  );
}

// 추위 참기 대회 포스터. 글자 없이 눈 결정과 금색 띠로 상금을 보여 준다
function ContestPoster({ x, y, z }: At) {
  return (
    <>
      <Flat size={[0.7, 0.96]} at={[x, y, z]} color="#2c6fa8" />
      <Flat size={[0.6, 0.2]} at={[x, y - 0.32, z + 0.005]} color="#e8b931" />
      <PixelText text="$1M" at={[x, y - 0.32, z + 0.01]} px={0.03} color={C.ink} />
      <Flat size={[0.06, 0.42]} at={[x, y + 0.14, z + 0.005]} color={C.paper} />
      <Flat size={[0.42, 0.06]} at={[x, y + 0.14, z + 0.005]} color={C.paper} />
      {[-0.13, 0.13].map((d) => (
        <Flat key={d} size={[0.1, 0.1]} at={[x + d, y + 0.14 + d, z + 0.004]} color="#bfe3f5" />
      ))}
      {[-0.13, 0.13].map((d) => (
        <Flat key={d} size={[0.1, 0.1]} at={[x + d, y + 0.14 - d, z + 0.004]} color="#bfe3f5" />
      ))}
    </>
  );
}

// 쌓인 전기세 고지서 뭉치
function BillPile({ x, y, z }: At) {
  return (
    <>
      <Box size={[0.42, 0.14, 0.3]} at={[x, y + 0.07, z]} color={C.paper} />
      <Box size={[0.36, 0.1, 0.26]} at={[x + 0.03, y + 0.19, z]} color="#e8e4d8" rot={[0, 0.25, 0]} />
      <Box size={[0.2, 0.012, 0.1]} at={[x + 0.03, y + 0.245, z + 0.04]} color={C.rust} rot={[0, 0.25, 0]} />
    </>
  );
}

// 얼음 속에 갇혀 실려 나가기 직전의 참가자. 벽을 보고 선 작은 실루엣이다
function IceBlock({ x, y, z }: At) {
  return (
    <>
      <Gem r={0.19} at={[x, y + 0.72, z]} color="#f0d2b2" />
      <Box size={[0.08, 0.04, 0.01]} at={[x, y + 0.72, z + 0.19]} color={C.ink} />
      <Box size={[0.3, 0.42, 0.18]} at={[x, y + 0.34, z]} color={C.rust} />
      <mesh position={[x, y + 0.52, z + 0.03]}>
        <boxGeometry args={[0.7, 1.06, 0.56]} />
        <meshLambertMaterial color="#9fdcf5" transparent opacity={0.55} flatShading />
      </mesh>
      <Box size={[0.08, 0.7, 0.01]} at={[x - 0.22, y + 0.6, z + 0.32]} color="#ffffff" />
    </>
  );
}

function SnowPile({ x, y, z }: At) {
  return (
    <>
      <Gem r={0.26} at={[x, y + 0.06, z]} color="#f4fbff" scale={[1.5, 0.6, 1]} />
      <Gem r={0.15} at={[x + 0.22, y + 0.03, z + 0.05]} color="#e3f2f9" scale={[1.3, 0.6, 1]} />
    </>
  );
}

// 대회장 벽의 큰 온도계. 수은이 거의 바닥에 있다
function Thermometer({ x, y, z }: At) {
  return (
    <>
      <Flat size={[0.3, 1.5]} at={[x, y, z]} color={C.paper} />
      <Flat size={[0.1, 1.28]} at={[x, y + 0.06, z + 0.005]} color="#d7dde0" />
      <Flat size={[0.1, 0.14]} at={[x, y - 0.5, z + 0.01]} color={C.rust} />
      <Flat size={[0.2, 0.2]} at={[x, y - 0.62, z + 0.01]} color={C.rust} />
      {[-0.3, -0.1, 0.1, 0.3, 0.5].map((d) => (
        <Flat key={d} size={[0.06, 0.02]} at={[x + 0.1, y + d, z + 0.01]} color={C.ink} />
      ))}
    </>
  );
}

function Whiteboard({ x, y, z }: At) {
  return (
    <>
      <Flat size={[1.0, 0.62]} at={[x, y, z]} color={C.metal} />
      <Flat size={[0.94, 0.56]} at={[x, y, z + 0.005]} color="#fbfbf8" />
      {/* 회의 때 그린 막대그래프와 메모 */}
      {[
        [0.08, C.navy],
        [0.16, C.teal],
        [0.26, C.rust],
      ].map(([h, color], i) => (
        <Flat key={i} size={[0.06, h as number]} at={[x - 0.36 + i * 0.09, y - 0.18 + (h as number) / 2, z + 0.01]} color={color as string} />
      ))}
      {[0.12, 0.04, -0.04, -0.12].map((d, i) => (
        <Flat key={d} size={[i === 3 ? 0.18 : 0.32, 0.02]} at={[x + 0.16 - (i === 3 ? 0.07 : 0), y + d, z + 0.01]} color={i === 0 ? C.rust : "#5a6370"} />
      ))}
      <Box size={[0.6, 0.03, 0.06]} at={[x, y - 0.33, z + 0.03]} color={C.metal} />
    </>
  );
}

function Menu({ x, y, z }: At) {
  return (
    <>
      <Flat size={[1.0, 0.38]} at={[x, y, z]} color={C.woodDark} />
      <Flat size={[0.92, 0.3]} at={[x, y, z + 0.005]} color="#f6ead6" />
      {[-0.23, 0.23].flatMap((cx) =>
        [0.08, 0, -0.08].map((dy) => (
          <group key={`${cx}-${dy}`}>
            <Flat size={[0.26, 0.025]} at={[x + cx - 0.05, y + dy, z + 0.01]} color="#4a4038" />
            <Flat size={[0.07, 0.025]} at={[x + cx + 0.14, y + dy, z + 0.01]} color={C.rust} />
          </group>
        )),
      )}
    </>
  );
}

function Notice({ x, y, z }: At) {
  return (
    <>
      <Flat size={[0.32, 0.44]} at={[x, y, z]} color={C.paper} />
      <Flat size={[0.24, 0.05]} at={[x, y + 0.14, z + 0.005]} color={C.rust} />
      {[0.05, -0.01, -0.07, -0.13].map((d, i) => (
        <Flat key={d} size={[i === 3 ? 0.14 : 0.24, 0.02]} at={[x - (i === 3 ? 0.05 : 0), y + d, z + 0.005]} color="#8a8780" />
      ))}
      {/* 모서리 테이프 */}
      {[-1, 1].map((s) => (
        <Flat key={s} size={[0.08, 0.04]} at={[x + 0.14 * s, y + 0.21, z + 0.01]} color="#e0c28f" />
      ))}
    </>
  );
}

function Aircon({ x, y, z }: At) {
  return (
    <>
      <Box size={[0.95, 0.3, 0.2]} at={[x, y, z + 0.1]} color="#f4f3ef" />
      <Box size={[0.85, 0.03, 0.01]} at={[x, y - 0.1, z + 0.205]} color="#9a9a96" />
      <Box size={[0.03, 0.02, 0.01]} at={[x + 0.38, y - 0.04, z + 0.205]} color="#5be38a" />
    </>
  );
}

function Multitap({ x, y, z }: At) {
  return (
    <>
      <Box size={[0.38, 0.06, 0.12]} at={[x, y + 0.03, z]} color="#f3f1ea" />
      {[-0.1, 0, 0.1].map((d) => (
        <Box key={d} size={[0.05, 0.01, 0.05]} at={[x + d - 0.03, y + 0.065, z]} color="#5a5a58" />
      ))}
      <Box size={[0.05, 0.035, 0.05]} at={[x + 0.15, y + 0.07, z]} color={C.rust} />
      <Box size={[0.02, 0.02, 0.4]} at={[x - 0.2, y + 0.01, z - 0.2]} color={C.ink} />
    </>
  );
}

function Cabinet({ x, y, z }: At) {
  return (
    <>
      <Box size={[0.75, 0.7, 0.4]} at={[x, y + 0.35, z]} color={C.wood} />
      <Box size={[0.7, 0.02, 0.01]} at={[x, y + 0.45, z + 0.205]} color={C.woodDark} />
      {[-0.17, 0.17].map((d) => (
        <Box key={d} size={[0.05, 0.03, 0.02]} at={[x + d, y + 0.55, z + 0.21]} color={C.ink} />
      ))}
    </>
  );
}

// 분홍 띠가 둘린 한국 전기밥솥
function RiceCooker({ x, y, z }: At) {
  return (
    <>
      <Cyl r={[0.15, 0.16]} h={0.2} at={[x, y + 0.1, z]} color="#f3f1ea" sides={10} />
      <Cyl r={0.161} h={0.03} at={[x, y + 0.16, z]} color="#d4265f" sides={10} />
      <Cyl r={0.14} h={0.05} at={[x, y + 0.225, z]} color="#c9ced2" sides={10} />
      <Box size={[0.12, 0.03, 0.03]} at={[x, y + 0.27, z]} color={C.ink} />
      <Box size={[0.03, 0.03, 0.01]} at={[x + 0.05, y + 0.08, z + 0.16]} color="#5be38a" />
    </>
  );
}

// 소주병이 삐죽 나온 편의점 봉투
function ShoppingBag({ x, y, z }: At) {
  return (
    <>
      <Cyl r={0.03} h={0.14} at={[x + 0.05, y + 0.38, z]} color="#3f9a5a" />
      <Gem r={0.17} at={[x, y + 0.18, z]} color="#f4f4f0" scale={[1, 1.15, 0.7]} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.03, 0.12, 0.03]} at={[x + 0.07 * s, y + 0.38, z]} color="#f4f4f0" />
      ))}
      <Box size={[0.2, 0.03, 0.01]} at={[x, y + 0.2, z + 0.12]} color={C.teal} />
    </>
  );
}

function Soju({ x, y, z }: At) {
  return (
    <>
      {[0, 0.11].map((d) => (
        <group key={d}>
          <Cyl r={0.045} h={0.2} at={[x + d, y + 0.1, z]} color="#3f9a5a" />
          <Cyl r={[0.02, 0.04]} h={0.08} at={[x + d, y + 0.24, z]} color="#3f9a5a" />
          <Box size={[0.07, 0.06, 0.01]} at={[x + d, y + 0.1, z + 0.045]} color={C.paper} />
        </group>
      ))}
    </>
  );
}

function CupRamen({ x, y, z }: At) {
  return (
    <>
      <Cyl r={[0.08, 0.06]} h={0.14} at={[x, y + 0.07, z]} color="#d4265f" sides={8} />
      <Cyl r={0.082} h={0.02} at={[x, y + 0.15, z]} color={C.plate} sides={8} />
      <Box size={[0.22, 0.015, 0.015]} at={[x + 0.02, y + 0.17, z]} color={C.wood} rot={[0, 0, 0.1]} />
    </>
  );
}

function Parcel({ x, y, z }: At) {
  return (
    <>
      <Box size={[0.46, 0.34, 0.36]} at={[x, y + 0.17, z]} color="#c8955a" />
      <Box size={[0.47, 0.01, 0.08]} at={[x, y + 0.345, z]} color="#e0c28f" />
      <Box size={[0.14, 0.09, 0.005]} at={[x - 0.1, y + 0.2, z + 0.183]} color={C.paper} />
      <Box size={[0.3, 0.2, 0.26]} at={[x + 0.04, y + 0.44, z]} color="#b9824a" />
      <Box size={[0.31, 0.01, 0.06]} at={[x + 0.04, y + 0.545, z]} color="#e0c28f" />
    </>
  );
}

function UmbrellaStand({ x, y, z }: At) {
  return (
    <>
      <Box size={[0.035, 0.5, 0.035]} at={[x - 0.04, y + 0.42, z]} color={C.navy} rot={[0, 0, 0.15]} />
      <Box size={[0.035, 0.46, 0.035]} at={[x + 0.05, y + 0.4, z]} color={C.rust} rot={[0, 0, -0.12]} />
      <Box size={[0.09, 0.03, 0.03]} at={[x - 0.1, y + 0.68, z]} color={C.ink} />
      <Cyl r={0.1} h={0.36} at={[x, y + 0.18, z]} color={C.metal} sides={8} />
    </>
  );
}

function Fan({ x, y, z }: At) {
  return (
    <>
      <Cyl r={0.14} h={0.04} at={[x, y + 0.02, z]} color="#e9e7e1" sides={8} />
      <Cyl r={0.025} h={0.7} at={[x, y + 0.37, z]} color="#e9e7e1" />
      <Cyl r={0.19} h={0.06} at={[x, y + 0.8, z]} color="#cfe4ec" sides={10} rot={[R, 0, 0]} />
      <Cyl r={0.05} h={0.08} at={[x, y + 0.8, z + 0.01]} color="#f4f3ef" sides={8} rot={[R, 0, 0]} />
    </>
  );
}

function Tissue({ x, y, z }: At) {
  return (
    <>
      <Box size={[0.24, 0.11, 0.14]} at={[x, y + 0.055, z]} color={C.paper} />
      <Box size={[0.245, 0.03, 0.145]} at={[x, y + 0.05, z]} color="#9fd3e8" />
      <Gem r={0.05} at={[x, y + 0.13, z]} color="#ffffff" />
    </>
  );
}

function Mug({ x, y, z }: At) {
  return (
    <>
      <Cyl r={0.055} h={0.11} at={[x, y + 0.055, z]} color={C.mustard} sides={8} />
      <Box size={[0.03, 0.06, 0.02]} at={[x + 0.07, y + 0.06, z]} color={C.mustard} />
    </>
  );
}

function Papers({ x, y, z }: At) {
  return (
    <>
      <Box size={[0.3, 0.025, 0.22]} at={[x, y + 0.0125, z]} color={C.paper} rot={[0, 0.1, 0]} />
      <Box size={[0.3, 0.025, 0.22]} at={[x + 0.02, y + 0.038, z]} color="#e4e1d8" rot={[0, -0.12, 0]} />
      <Box size={[0.3, 0.025, 0.22]} at={[x - 0.01, y + 0.063, z]} color={C.paper} rot={[0, 0.05, 0]} />
      <Box size={[0.04, 0.03, 0.06]} at={[x + 0.12, y + 0.08, z]} color={C.rust} />
    </>
  );
}

function Slippers({ x, y, z }: At) {
  return (
    <>
      {[-0.07, 0.08].map((d, i) => (
        <group key={d}>
          <Box size={[0.11, 0.035, 0.24]} at={[x + d, y + 0.018, z + i * 0.04]} color="#7fa6c2" rot={[0, i ? -0.2 : 0.1, 0]} />
          <Box size={[0.12, 0.035, 0.07]} at={[x + d, y + 0.05, z + 0.07 + i * 0.04]} color="#5d7f99" rot={[0, i ? -0.2 : 0.1, 0]} />
        </group>
      ))}
    </>
  );
}

function Tambourine({ x, y, z }: At) {
  return (
    <>
      <Cyl r={0.14} h={0.05} at={[x, y + 0.025, z]} color="#e8b931" sides={10} />
      <Cyl r={0.11} h={0.052} at={[x, y + 0.026, z]} color="#f6ead6" sides={10} />
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} size={[0.04, 0.03, 0.04]} at={[x + Math.cos(i * R + 0.4) * 0.14, y + 0.03, z + Math.sin(i * R + 0.4) * 0.14]} color={C.metal} />
      ))}
    </>
  );
}

// 장면마다 어딘가 숨어 있는 nuanci 고양이 Mochi (2.5D 도트 치비 스타일)
function MochiCameo({ x, y, z }: At) {
    return (
        <group position={[x, y, z]}>
            <PixRect w={0.04} h={0.22} at={[0.14, 0.14, -0.02]} color={FUR} rot={-0.45} outlineZ={-0.045} />
            <PixOval rx={0.13} ry={0.12} at={[0, 0.13, 0]} color={FUR} outlineZ={-0.04} />
            <PixOval rx={0.07} ry={0.07} at={[0, 0.11, 0.02]} color="#fff5e8" outline={false} />
            <PixOval rx={0.16} ry={0.13} at={[0, 0.34, 0.02]} color={FUR} outlineZ={-0.035} />
            {[-1, 1].map((s) => (
                <group key={s}>
                    <PixRect w={0.08} h={0.09} at={[0.09 * s, 0.46, 0.01]} color={FUR} outlineZ={-0.04} />
                    <PixRect w={0.04} h={0.05} at={[0.09 * s, 0.45, 0.03]} color="#ff9ebb" outline={false} />
                    <PixRect w={0.056} h={0.072} at={[0.068 * s, 0.34, 0.05]} color={C.ink} outline={false} />
                    <PixRect w={0.028} h={0.028} at={[0.068 * s - 0.012, 0.355, 0.06]} color="#ffffff" outline={false} />
                    <PixRect w={0.056} h={0.028} at={[0.105 * s, 0.295, 0.05]} color="#ff7aa2" outline={false} />
                </group>
            ))}
            <PixRect w={0.035} h={0.028} at={[0, 0.3, 0.05]} color="#ff7aa2" outline={false} />
        </group>
    );
}

// 여러 장면에 숨어 있는 푸딩. '사라진 푸딩'의 범인을 찾는 이스터에그
function Pudding({ x, y, z }: At) {
  return (
    <>
      <Cyl r={[0.065, 0.075]} h={0.09} at={[x, y + 0.045, z]} color="#f2d34a" sides={8} />
      <Cyl r={0.06} h={0.025} at={[x, y + 0.1, z]} color="#7a4a22" sides={8} />
    </>
  );
}

// 삼각대에 올린 촬영 카메라. 렌즈는 무대 가운데를 보고, 위에 빨간 녹화 램프가 있다
function TripodCam({ x, y, z }: At) {
  const dir = x > 0 ? -1 : 1;
  return (
    <>
      {[-0.22, 0, 0.22].map((tilt, i) => (
        <Box key={i} size={[0.03, 1.2, 0.03]} at={[x + tilt * 0.6, y + 0.58, z + (i === 1 ? -0.14 : 0.07)]} color={C.ink} rot={[i === 1 ? -0.22 : 0.12, 0, tilt]} />
      ))}
      <Box size={[0.1, 0.06, 0.1]} at={[x, y + 1.2, z]} color={C.ink} />
      <Box size={[0.34, 0.24, 0.2]} at={[x, y + 1.36, z]} color="#2b2b2a" />
      <Cyl r={0.09} h={0.16} at={[x + dir * 0.24, y + 1.36, z]} color="#3a3a38" rot={[0, 0, Math.PI / 2]} sides={10} />
      <Cyl r={0.06} h={0.01} at={[x + dir * 0.325, y + 1.36, z]} color="#5a8fb0" rot={[0, 0, Math.PI / 2]} sides={10} />
      <Gem r={0.03} at={[x - dir * 0.1, y + 1.51, z]} color="#e03131" />
    </>
  );
}

// 링 조명. 가운데에 휴대폰 거치대가 있다
function RingLight({ x, y, z }: At) {
  return (
    <>
      <Cyl r={[0.16, 0.2]} h={0.04} at={[x, y + 0.02, z]} color={C.ink} sides={8} />
      <Cyl r={0.025} h={1.55} at={[x, y + 0.8, z]} color={C.ink} />
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return <Gem key={i} r={0.05} at={[x + Math.cos(a) * 0.3, y + 1.85 + Math.sin(a) * 0.3, z]} color="#fff6dc" />;
      })}
      <Box size={[0.09, 0.16, 0.02]} at={[x, y + 1.85, z + 0.02]} color={C.ink} />
    </>
  );
}

// 안마의자. 정면에서는 의자로 안 읽혀서 옆으로 돌려 둔다. 뒤로 누운 등받이, 머리 덮개, 앞으로 뻗은 다리 받침이 보인다
function MassageChair({ x, y, z }: At) {
  const shell = "#e4dccd";
  const pad = "#3a2f2a";
  return (
    <group position={[x, y, z]} rotation={[0, x > 0 ? -1.1 : 1.1, 0]}>
      <Box size={[0.7, 0.34, 0.66]} at={[0, 0.17, 0]} color={pad} />
      <Box size={[0.58, 0.1, 0.6]} at={[0, 0.39, 0.02]} color="#5a4a42" />
      <Box size={[0.62, 1.05, 0.24]} at={[0, 0.86, -0.42]} color={pad} rot={[-0.5, 0, 0]} />
      <Box size={[0.72, 0.42, 0.42]} at={[0, 1.36, -0.66]} color={shell} rot={[-0.5, 0, 0]} />
      {[-0.4, 0.4].map((d) => (
        <group key={d}>
          <Box size={[0.16, 0.5, 0.78]} at={[d, 0.6, -0.02]} color={shell} />
          <Box size={[0.17, 0.07, 0.5]} at={[d, 0.86, 0.04]} color={C.metal} />
        </group>
      ))}
      <Box size={[0.46, 0.16, 0.62]} at={[0, 0.3, 0.56]} color={shell} rot={[-0.55, 0, 0]} />
      <Box size={[0.46, 0.1, 0.16]} at={[0, 0.1, 0.86]} color={pad} />
      <Box size={[0.14, 0.05, 0.3]} at={[0.4, 0.92, 0.22]} color={C.ink} />
      <Gem r={0.025} at={[0.4, 0.95, 0.3]} color="#4fd1c5" />
    </group>
  );
}

// 둥근 중고 스쿠터. 바퀴 둘, 발판, 핸들, 앞 전조등
function Scooter({ x, y, z }: At) {
  const body = "#7fc8b8";
  return (
    <>
      {[-0.42, 0.42].map((d) => (
        <group key={d}>
          <Cyl r={0.17} h={0.09} at={[x + d, y + 0.17, z]} color={C.ink} rot={[Math.PI / 2, 0, 0]} sides={12} />
          <Cyl r={0.07} h={0.1} at={[x + d, y + 0.17, z]} color={C.metal} rot={[Math.PI / 2, 0, 0]} sides={8} />
        </group>
      ))}
      <Box size={[0.62, 0.08, 0.3]} at={[x, y + 0.3, z]} color="#5b5b58" />
      <Box size={[0.42, 0.36, 0.36]} at={[x - 0.36, y + 0.48, z]} color={body} />
      <Box size={[0.38, 0.08, 0.32]} at={[x - 0.32, y + 0.7, z]} color="#3a2f2a" />
      <Box size={[0.16, 0.6, 0.3]} at={[x + 0.4, y + 0.56, z]} color={body} rot={[0, 0, -0.18]} />
      <Cyl r={0.025} h={0.36} at={[x + 0.47, y + 1.0, z]} color={C.metal} />
      <Box size={[0.06, 0.04, 0.5]} at={[x + 0.47, y + 1.18, z]} color={C.ink} />
      <Gem r={0.055} at={[x + 0.52, y + 1.05, z + 0.02]} color="#fff2b0" />
      <Box size={[0.3, 0.05, 0.31]} at={[x + 0.42, y + 0.36, z]} color={body} />
    </>
  );
}

// 뚜껑이 열린 잡동사니 상자. 램프·책·공 같은 게 삐져나와 있다
function JunkBox({ x, y, z }: At) {
  return (
    <>
      <Box size={[0.56, 0.36, 0.4]} at={[x, y + 0.18, z]} color="#c8955a" />
      <Box size={[0.56, 0.02, 0.16]} at={[x, y + 0.42, z - 0.24]} color="#b9824a" rot={[-0.9, 0, 0]} />
      <Box size={[0.2, 0.02, 0.4]} at={[x - 0.36, y + 0.42, z]} color="#b9824a" rot={[0, 0, 0.9]} />
      <Box size={[0.22, 0.08, 0.16]} at={[x - 0.1, y + 0.4, z]} color={C.navy} rot={[0, 0, 0.2]} />
      <Cyl r={[0.04, 0.1]} h={0.16} at={[x + 0.12, y + 0.48, z - 0.04]} color={C.mustard} />
      <Gem r={0.08} at={[x + 0.02, y + 0.42, z + 0.1]} color={C.rust} />
      <Box size={[0.03, 0.3, 0.03]} at={[x + 0.2, y + 0.45, z + 0.08]} color={C.woodDark} rot={[0, 0, -0.3]} />
    </>
  );
}

// 막대에 꽂아 땅에 세운 골판지 팻말. 글자는 도트 글자로 찍는다
function CardboardSign({ x, y, z, text, ink }: At & { text: string; ink: string }) {
  const w = Math.max(0.62, text.length * 0.13 + 0.14);
  return (
    <>
      <Box size={[0.04, 0.7, 0.04]} at={[x, y + 0.35, z - 0.02]} color={C.woodDark} />
      <Box size={[w, 0.34, 0.02]} at={[x, y + 0.82, z]} color="#d2a66b" rot={[0, 0, 0.04]} />
      <PixelText text={text} at={[x, y + 0.82, z + 0.012]} px={0.022} color={ink} />
    </>
  );
}
const SaleSign = (p: At) => <CardboardSign {...p} text="SALE" ink="#c92a2a" />;
const TradeSign = (p: At) => <CardboardSign {...p} text="WILL TRADE" ink={C.ink} />;

const PIECES: Record<DecorId, (p: At) => React.ReactNode> = {
  fridge: Fridge,
  postit: PostIt,
  calendar: Calendar,
  picture: Picture,
  poster: Poster,
  whiteboard: Whiteboard,
  menu: Menu,
  notice: Notice,
  aircon: Aircon,
  multitap: Multitap,
  cabinet: Cabinet,
  "rice-cooker": RiceCooker,
  "shopping-bag": ShoppingBag,
  soju: Soju,
  "cup-ramen": CupRamen,
  parcel: Parcel,
  "umbrella-stand": UmbrellaStand,
  fan: Fan,
  tissue: Tissue,
  mug: Mug,
  papers: Papers,
  slippers: Slippers,
  tambourine: Tambourine,
  mochi: MochiCameo,
  pudding: Pudding,
  "contest-poster": ContestPoster,
  "bill-pile": BillPile,
  "ice-block": IceBlock,
  "snow-pile": SnowPile,
  thermometer: Thermometer,
  "tripod-cam": TripodCam,
  "ring-light": RingLight,
  "massage-chair": MassageChair,
  scooter: Scooter,
  "junk-box": JunkBox,
  "sale-sign": SaleSign,
  "trade-sign": TradeSign,
};

// 알 수 없는 id는 건너뛴다. 장면 JSON에 오타가 있어도 무대가 깨지지 않게 한다
export function DecorPieces({ items }: { items: Decor[] }) {
  return (
    <>
      {items.map((d, i) => {
        const Piece = PIECES[d.id];
        if (!Piece) return null;
        const at = { x: d.x, y: d.y ?? DEFAULTS[d.id].y, z: d.z ?? DEFAULTS[d.id].z };
        return <Piece key={`${d.id}-${i}`} {...at} />;
      })}
    </>
  );
}
