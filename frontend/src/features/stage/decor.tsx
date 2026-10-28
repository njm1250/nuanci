"use client";

import { C } from "./palette";
import { Box, Cyl, Flat, Gem } from "./primitives";
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
