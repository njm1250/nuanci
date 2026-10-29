import * as THREE from "three";
import type { Expression } from "@/features/scene/types";

// 메이플스토리식 2D 픽셀 인물(시험용: Sam). 3D 도형 대신 픽셀 그림을 그려 무대에 판으로 세운다.
// - 머리가 키의 60% 안팎인 2등신, 코 없이 작은 입
// - 검은 테두리 대신 칸마다 자기 색을 어둡게 한 테두리(색 외곽선)라 딱딱하지 않고 말랑해 보인다
// - 표정은 눈·입 그림만 바꿔 끼운다
// 무대는 가로 200픽셀이라, 그림 1픽셀이 무대 1픽셀이 되게 그린다(늘리면 도트 굵기가 들쭉날쭉해진다)
export const SPRITE_PPU = 200 / 5.6;

const S = 1.5; // 아래 좌표는 34×42 밑그림 기준이고, 1.5배로 키워 그린다
export const SPRITE_W = Math.round(34 * S);
export const SPRITE_H = Math.round(42 * S);

type Grid = (string | null)[][];

const HAIR = "#6b4130";
const HAIR_LIGHT = "#8c5a40";
const SKIN = "#ffe4cc";
const SKIN_SHADE = "#f6c6a4";
const SHIRT = "#ffc94d";
const SHIRT_SHADE = "#e9a531";
const SHIRT_LIGHT = "#ffe08a";
const SHOE = "#7a4632";
const RIBBON = "#ff7fa6";
const EYE = "#2b1b2c";
const EYE_LOW = "#7a58a0";
const BLUSH = "#ffa3b5";
const MOUTH = "#b9475c";
const TONGUE = "#ff8a9c";
const TEAR = "#8ecbff";

// 눈(8×9)과 입(4×3) 그림. E 눈동자, W 안광, L 아래 밝은 눈, O 흰자 테두리, T 눈물, M 입, P 혀
const EYES: Record<string, string[]> = {
  open: ["..EEEE..", ".EEEEEE.", "EWWWEEEE", "EWWWEEEE", "EWWEEEEE", "EEEEEEWE", "ELLLLLLE", ".LLLLLL.", "..LLLL.."],
  happy: ["........", "........", "........", "..EEEE..", ".E....E.", "E......E", "........", "........", "........"],
  shocked: ["..OOOO..", ".OWWWWO.", "OWWWWWWO", "OWWEEWWO", "OWWEEWWO", "OWWWWWWO", ".OWWWWO.", "..OOOO..", "........"],
  closed: ["........", "........", "........", "........", "E......E", ".EEEEEE.", "........", "........", "........"],
  crying: ["........", "........", "........", "EEEEEEEE", "...TT...", "...TT...", "...TT...", "...TT...", "...TT..."],
};
const MOUTHS: Record<string, string[]> = {
  smile: ["M..M", ".MM.", "...."],
  open: [".MM.", "MPPM", ".MM."],
  shock: [".MM.", "M..M", ".MM."],
  frown: ["....", ".MM.", "M..M"],
  flat: ["....", "MMMM", "...."],
};

export function spriteFace(expression: Expression): { eyes: string; mouth: string } {
  switch (expression) {
    case "happy":
    case "delighted":
    case "love":
      return { eyes: "happy", mouth: "open" };
    case "shocked":
    case "angry":
    case "dizzy":
      return { eyes: "shocked", mouth: "shock" };
    case "crying":
      return { eyes: "crying", mouth: "frown" };
    case "sleepy":
      return { eyes: "closed", mouth: "smile" };
    case "stuffed":
      return { eyes: "happy", mouth: "smile" };
    case "puzzled":
    case "awkward":
      return { eyes: "open", mouth: "flat" };
    default:
      return { eyes: "open", mouth: "smile" };
  }
}

function draw(face: { eyes: string; mouth: string }, legs: boolean): Grid {
  const g: Grid = Array.from({ length: SPRITE_H }, () => Array(SPRITE_W).fill(null));
  const put = (x: number, y: number, c: string | null) => {
    if (x >= 0 && y >= 0 && x < SPRITE_W && y < SPRITE_H) g[y][x] = c;
  };
  // 밑그림 좌표로 타원·사각형을 칠한다
  const ell = (cx: number, cy: number, rx: number, ry: number, c: string, keep?: (x: number, y: number) => boolean) => {
    for (let y = 0; y < SPRITE_H; y++)
      for (let x = 0; x < SPRITE_W; x++)
        if (((x + 0.5 - cx * S) / (rx * S)) ** 2 + ((y + 0.5 - cy * S) / (ry * S)) ** 2 <= 1 && (!keep || keep(x, y))) put(x, y, c);
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = Math.round(y0 * S); y < Math.round((y1 + 1) * S); y++) for (let x = Math.round(x0 * S); x < Math.round((x1 + 1) * S); x++) put(x, y, c);
  };
  const stamp = (rows: string[], x0: number, y0: number, colors: Record<string, string>) =>
    rows.forEach((row, dy) => [...row].forEach((ch, dx) => colors[ch] && put(x0 + dx, y0 + dy, colors[ch])));

  if (legs) {
    rect(13, 36, 15, 38, SKIN);
    rect(18, 36, 20, 38, SKIN);
    rect(12, 38, 15, 39, SHOE);
    rect(18, 38, 21, 39, SHOE);
  }
  // 몸통: 작고 동글게, 오른쪽 아래에 그늘
  ell(17, 32, 7, 6, SHIRT);
  rect(11, 32, 22, 36, SHIRT);
  rect(21, 31, 22, 36, SHIRT_SHADE);
  rect(11, 36, 22, 36, SHIRT_SHADE);
  rect(14, 27, 19, 28, SHIRT_LIGHT);
  // 팔과 동그란 만두손
  ell(9.5, 32.5, 2.2, 3, SHIRT);
  ell(24.5, 32.5, 2.2, 3, SHIRT);
  ell(9.5, 35.5, 1.6, 1.6, SKIN);
  ell(24.5, 35.5, 1.6, 1.6, SKIN);
  // 뒷머리와 똥머리
  ell(17, 14, 13, 12, HAIR);
  ell(17, 2.8, 4.2, 3.2, HAIR);
  ell(16, 2, 1.6, 1, HAIR_LIGHT);
  // 크고 납작한 찹쌀떡 얼굴, 턱 아래 그늘
  ell(17, 17.5, 11, 9, SKIN);
  ell(17, 24.2, 8, 1.6, SKIN_SHADE, (_, y) => y >= 24 * S);
  // 이마를 덮는 둥근 앞머리, 볼까지 내려오는 옆머리, 윤기 한 점, 리본
  ell(17, 9.5, 12, 6.5, HAIR, (_, y) => y <= 12.5 * S);
  ell(12, 7.5, 3, 1.3, HAIR_LIGHT);
  rect(6, 13, 7, 21, HAIR);
  rect(27, 13, 28, 21, HAIR);
  rect(14, 5, 20, 5, RIBBON);
  // 앞머리 바로 아래 얼굴에 그늘 한 줄
  for (let x = 0; x < SPRITE_W; x++) for (let y = 1; y < SPRITE_H; y++) if (g[y][x] === SKIN && g[y - 1][x] === HAIR && y > 15) put(x, y, SKIN_SHADE);

  stamp(EYES[face.eyes], 13, 22, { E: EYE, W: "#ffffff", L: EYE_LOW, O: EYE, T: TEAR });
  stamp(EYES[face.eyes], 31, 22, { E: EYE, W: "#ffffff", L: EYE_LOW, O: EYE, T: TEAR });
  for (const bx of [10, 38]) for (let x = bx; x < bx + 4; x++) for (const y of [32, 33]) put(x, y, BLUSH);
  stamp(MOUTHS[face.mouth], 24, 35, { M: MOUTH, P: TONGUE });

  // 색 외곽선: 빈칸 중 그림과 맞닿은 칸을 맞닿은 색을 어둡게 한 색으로 칠한다
  const out: Grid = g.map((row) => row.slice());
  for (let y = 0; y < SPRITE_H; y++)
    for (let x = 0; x < SPRITE_W; x++) {
      if (g[y][x]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = g[y + dy]?.[x + dx];
        if (c) {
          out[y][x] = darken(c);
          break;
        }
      }
    }
  return out;
}

function darken(hex: string) {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color("#2a1418"), 0.5);
  return `#${c.getHexString()}`;
}

const cache = new Map<string, THREE.DataTexture>();

// 표정·앉음 여부마다 한 번만 그림을 만들어 텍스처로 쓴다. 픽셀이 번지지 않게 가장 가까운 칸으로만 읽는다
export function spriteTexture(expression: Expression, sitting: boolean) {
  const face = spriteFace(expression);
  const key = `${face.eyes}:${face.mouth}:${sitting}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const grid = draw(face, !sitting);
  const data = new Uint8Array(SPRITE_W * SPRITE_H * 4);
  grid.forEach((row, y) =>
    row.forEach((c, x) => {
      if (!c) return;
      // 텍스처는 아래 줄부터 읽어서 위아래를 뒤집어 넣는다. 색은 THREE.Color를 거치지 않고 그대로 넣어야 sRGB 값이 바뀌지 않는다
      const i = ((SPRITE_H - 1 - y) * SPRITE_W + x) * 4;
      data[i] = parseInt(c.slice(1, 3), 16);
      data[i + 1] = parseInt(c.slice(3, 5), 16);
      data[i + 2] = parseInt(c.slice(5, 7), 16);
      data[i + 3] = 255;
    }),
  );
  const texture = new THREE.DataTexture(data, SPRITE_W, SPRITE_H, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}
