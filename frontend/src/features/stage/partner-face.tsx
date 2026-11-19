import { CAST } from "./cast";
import { C } from "./palette";
import type { CastId } from "./types";
import type { Expression } from "@/features/scene/types";

const SKIN = "#ffe3ca";
const BLUSH = "#ff7aa2";
const WHITE = "#ffffff";
const ROSE = "#ff5c8a";
const TEAR = "#5bc0ff";

type Cell = string | null;

function paint(grid: Cell[][], coords: [number, number][], color: string) {
  for (const [r, c] of coords) {
    if (r >= 0 && r < 16 && c >= 0 && c < 16) grid[r][c] = color;
  }
}

function rect(grid: Cell[][], r0: number, c0: number, h: number, w: number, color: string) {
  for (let r = r0; r < r0 + h; r++) {
    for (let c = c0; c < c0 + w; c++) {
      if (r >= 0 && r < 16 && c >= 0 && c < 16) grid[r][c] = color;
    }
  }
}

function drawFaceGrid(partner: CastId, expression: Expression): Cell[][] {
  const look = CAST[partner];
  const g: Cell[][] = Array.from({ length: 16 }, () => Array<Cell>(16).fill(null));
  const ink = C.ink;
  const skin = look.animal?.fur ?? SKIN;
  const hair = look.hair;

  // 1. 어깨(옷) — 아래쪽 2줄에 상대 셔츠 색이 살짝 보인다
  rect(g, 14, 4, 2, 8, look.shirt);
  paint(g, [[14, 3], [15, 3], [14, 12], [15, 12], [13, 4], [13, 11]], ink);
  if (look.tie) {
    paint(g, [[14, 7], [14, 8], [15, 7], [15, 8]], look.tie);
  }
  if (look.apron) {
    rect(g, 14, 5, 2, 6, look.apron);
  }

  // 2. 동물 귀 (머리 뒤쪽 레이어)
  if (look.animal?.kind === "bear") {
    // 곰 귀 (보리): 둥근 양쪽 귀 + 밝은 안쪽
    rect(g, 1, 2, 4, 4, ink);
    rect(g, 2, 3, 2, 2, skin);
    paint(g, [[3, 3]], look.animal.inner);
    rect(g, 1, 10, 4, 4, ink);
    rect(g, 2, 11, 2, 2, skin);
    paint(g, [[3, 12]], look.animal.inner);
  } else if (look.animal?.kind === "cat") {
    // 고양이 귀 (모치): 뾰족한 삼각 귀
    paint(g, [[1, 3], [2, 2], [2, 4], [3, 2], [3, 5], [4, 2]], ink);
    paint(g, [[2, 3], [3, 3], [3, 4]], skin);
    paint(g, [[3, 3]], look.animal.inner);
    paint(g, [[1, 12], [2, 11], [2, 13], [3, 10], [3, 13], [4, 13]], ink);
    paint(g, [[2, 12], [3, 11], [3, 12]], skin);
    paint(g, [[3, 12]], look.animal.inner);
  }

  // 3. 기본 얼굴 윤곽 (rows 3..13, cols 3..12)
  rect(g, 4, 3, 9, 10, skin);
  rect(g, 3, 4, 1, 8, ink);
  rect(g, 13, 4, 1, 8, ink);
  rect(g, 4, 2, 8, 1, ink);
  rect(g, 4, 13, 8, 1, ink);
  paint(g, [[4, 3], [4, 12], [12, 3], [12, 12]], ink);
  // 모서리 안쪽 채우기
  paint(g, [[4, 4], [4, 11], [12, 4], [12, 11]], skin);

  // 강아지 귀(콩): 얼굴 양옆으로 축 처진 갈색 귀
  if (look.animal?.kind === "dog") {
    rect(g, 5, 1, 6, 2, ink);
    rect(g, 6, 1, 4, 1, look.animal.inner);
    rect(g, 5, 13, 6, 2, ink);
    rect(g, 6, 14, 4, 1, look.animal.inner);
  }

  // 4. 사람 머리 스타일
  if (!look.animal) {
    if (look.hairStyle === "bun") {
      // 올림머리 번
      rect(g, 0, 6, 3, 4, ink);
      rect(g, 1, 7, 2, 2, hair);
      rect(g, 3, 4, 3, 8, hair);
      rect(g, 2, 4, 1, 8, ink);
      paint(g, [[3, 3], [4, 3], [5, 3], [3, 12], [4, 12], [5, 12]], ink);
      paint(g, [[4, 4], [5, 4], [4, 11], [5, 11]], hair);
      paint(g, [[6, 5], [6, 8], [6, 10]], hair);
    } else if (look.hairStyle === "curly") {
      // 곱슬머리 볼륨
      rect(g, 1, 4, 2, 8, ink);
      rect(g, 2, 3, 4, 10, hair);
      paint(g, [[1, 5], [1, 7], [1, 10], [2, 2], [3, 2], [4, 2], [2, 13], [3, 13], [4, 13]], ink);
      paint(g, [[2, 4], [2, 6], [2, 8], [2, 10], [2, 11], [5, 3], [5, 12], [6, 3], [6, 12]], hair);
      paint(g, [[6, 5], [6, 7], [6, 9], [6, 11]], hair);
    } else if (look.hairStyle === "cap") {
      // 캡 모자 (바리스타, 스누지)
      rect(g, 1, 4, 1, 8, ink);
      rect(g, 2, 3, 3, 10, hair);
      paint(g, [[2, 2], [3, 2], [4, 2], [2, 13], [3, 13], [4, 13]], ink);
      // 모자 챙
      rect(g, 5, 3, 1, 11, ink);
    } else if (look.hairStyle === "long") {
      rect(g, 2, 4, 1, 8, ink);
      rect(g, 3, 3, 3, 10, hair);
      rect(g, 6, 2, 7, 2, hair);
      rect(g, 6, 12, 7, 2, hair);
      paint(g, [[3, 2], [4, 2], [5, 2], [3, 13], [4, 13], [5, 13]], ink);
    } else {
      // short / fluffy
      rect(g, 2, 4, 1, 8, ink);
      rect(g, 3, 3, 3, 10, hair);
      paint(g, [[3, 2], [4, 2], [5, 2], [3, 13], [4, 13], [5, 13]], ink);
      paint(g, [[6, 3], [6, 12], [6, 5], [6, 9]], hair);
    }
  }

  // 5. 동물 주둥이 (곰, 강아지)
  if (look.animal?.kind === "bear" || look.animal?.kind === "dog") {
    rect(g, 9, 6, 3, 4, look.animal.inner);
    paint(g, [[9, 7], [9, 8]], ink);
  }

  // 6. 볼터치
  paint(g, [[9, 4], [9, 11]], BLUSH);

  // 7. 표정 (눈 · 입)
  const leftEye: [number, number][] = [[7, 5], [8, 5], [7, 6], [8, 6]];
  const rightEye: [number, number][] = [[7, 9], [8, 9], [7, 10], [8, 10]];

  if (expression === "delighted" || expression === "stuffed") {
    paint(g, [[7, 5], [8, 4], [8, 6], [7, 10], [8, 9], [8, 11]], ink);
    paint(g, [[10, 6], [10, 7], [10, 8], [10, 9]], ink);
    if (expression === "delighted") paint(g, [[11, 7], [11, 8]], ROSE);
  } else if (expression === "sleepy") {
    paint(g, [[8, 4], [8, 5], [8, 6], [8, 9], [8, 10], [8, 11]], ink);
    paint(g, [[11, 7], [11, 8]], ink);
  } else if (expression === "angry") {
    paint(g, [...leftEye, ...rightEye], ink);
    paint(g, [[6, 4], [6, 5], [6, 10], [6, 11]], ink);
    paint(g, [[11, 6], [10, 7], [10, 8], [11, 9]], ink);
  } else if (expression === "shocked") {
    paint(g, [...leftEye, ...rightEye], ink);
    paint(g, [[7, 5], [7, 9]], WHITE);
    paint(g, [[10, 7], [10, 8], [11, 7], [11, 8]], ROSE);
  } else if (expression === "awkward") {
    paint(g, [...leftEye, ...rightEye], ink);
    paint(g, [[7, 5], [7, 9]], WHITE);
    paint(g, [[11, 6], [10, 7], [11, 8], [10, 9]], ink);
    paint(g, [[5, 11], [6, 12], [7, 12]], TEAR);
  } else if (expression === "puzzled") {
    paint(g, [...leftEye, ...rightEye], ink);
    paint(g, [[7, 5], [7, 9]], WHITE);
    paint(g, [[6, 9], [6, 10]], ink);
    paint(g, [[11, 7], [11, 8], [11, 9]], ink);
  } else if (expression === "crying") {
    paint(g, [[8, 5], [8, 6], [8, 9], [8, 10]], ink);
    paint(g, [[9, 5], [10, 5], [11, 5], [9, 10], [10, 10], [11, 10]], TEAR);
    paint(g, [[11, 7], [11, 8]], ink);
  } else if (expression === "love") {
    paint(g, [[7, 4], [7, 6], [8, 5], [7, 9], [7, 11], [8, 10]], ROSE);
    paint(g, [[10, 6], [11, 7], [11, 8], [10, 9]], ink);
  } else if (expression === "happy") {
    paint(g, [...leftEye, ...rightEye], ink);
    paint(g, [[7, 5], [7, 9]], WHITE);
    paint(g, [[10, 6], [11, 7], [11, 8], [10, 9]], ink);
  } else {
    // neutral / dizzy
    paint(g, [...leftEye, ...rightEye], ink);
    paint(g, [[7, 5], [7, 9]], WHITE);
    paint(g, [[11, 7], [11, 8]], ink);
  }

  // 8. 안경 (Alex, Boss, Grandpa)
  if (look.glasses) {
    paint(g, [
      [6, 4], [6, 5], [6, 6], [9, 4], [9, 5], [9, 6], [7, 4], [8, 4], [7, 7],
      [6, 9], [6, 10], [6, 11], [9, 9], [9, 10], [9, 11], [7, 11], [8, 11], [7, 8],
    ], ink);
  }

  return g;
}

// 무대 CAST 설정(동물 귀·머리 모양·안경·옷 색)을 그대로 옮긴 16×16 상대 도트 얼굴
export function PartnerFace({ partner, expression = "neutral", size = 46 }: { partner: CastId; expression?: Expression; size?: number }) {
  const grid = drawFaceGrid(partner, expression);
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden className="shrink-0">
      {grid.flatMap((row, r) =>
        row.map((color, c) => (color ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color} /> : null)),
      )}
    </svg>
  );
}
