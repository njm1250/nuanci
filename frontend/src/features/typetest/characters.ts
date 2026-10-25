// 유형마다 Mochi가 다른 옷과 소품을 걸친 픽셀 캐릭터. 결과 화면, 공유 카드, 도감이 같은 격자를 쓴다
import type { TypeId } from "./types";

// 공통 색. 대문자 한 글자는 유형마다 바꾸는 셔츠 색(S)과 소품 강조색(A)
const PALETTE: Record<string, string> = {
  k: "#141317",
  o: "#f0a24a",
  c: "#ffd9b8",
  b: "#f28fa5",
  w: "#ffffff",
  g: "#c8f031",
  y: "#ffd23f",
  r: "#e5484d",
  u: "#4a7bd8",
  l: "#8ecbff",
  d: "#7a4a24",
  t: "#c98a4b",
  e: "#9aa0a6",
  m: "#ffe9a8",
  n: "#e86a88",
};

// 원래 Mochi(16×17)를 24×24 칸 가운데 아래에 두고, 모자·소품은 그 위에 덧그린다
const MOCHI = [
  "..k..........k..",
  ".kok........kok.",
  ".kcok......kock.",
  ".koookkkkkkoook.",
  "kooooooooooooook",
  "kookkooooookkook",
  "kookkooooookkook",
  "kobbooonnooobbok",
  "koooookookoooook",
  ".koooookkoooook.",
  "..kkkkkkkkkkkk..",
  "...kSSSSSSSSk...",
  ".kokSSSSSSSSkok.",
  ".kokSSSSSSSSkok.",
  "...kSSSSSSSSk...",
  "...kook..kook...",
  "...kkkk..kkkk...",
];
const OX = 4;
const OY = 6;
export const CHAR_SIZE = 24;

// x, y는 24×24 칸 기준. 점(.)은 비워 두고 밑그림을 그대로 보인다
type Layer = [x: number, y: number, rows: string[]];
type Look = { shirt: string; accent?: string; layers: Layer[] };

const LOOKS: Record<TypeId, Look> = {
  // 현지인 빙의형: 선글라스에 테이크아웃 커피
  native: {
    shirt: "#5fd3b3",
    layers: [
      [6, 11, ["kkkkkkkkkkkk", "kwkk....kwkk", ".kk......kk."]],
      [18, 14, [".kk.", "kkkk", "kwwk", "kddk", "kwwk", ".kk."]],
    ],
  },
  // 푸딩 범인형: 들고 있는 푸딩, 입가에 묻은 캐러멜, 식은땀
  pudding: {
    shirt: "#ffd166",
    layers: [
      [0, 15, ["..kk..", ".kddk.", "kyyyyk", "kyyyyk", "kkkkkk"]],
      [14, 15, ["d"]],
      [20, 7, [".l", "ll", "ll"]],
    ],
  },
  // 교과서 로봇형: 안테나, 초록 불빛 눈, 들고 있는 교과서
  robot: {
    shirt: "#a9b4c2",
    layers: [
      [10, 2, [".kkkk.", "kggggk", ".kkkk.", "..kk..", "..kk..", "..kk..", "..kk.."]],
      [7, 11, ["gg", "gg"]],
      [15, 11, ["gg", "gg"]],
      [1, 16, ["kkkkk", "kuuuk", "kuwuk", "kuuuk", "kkkkk"]],
    ],
  },
  // 콩글리시 네이티브형: 화이팅 머리띠, 휘날리는 끈
  konglish: {
    shirt: "#5b8def",
    layers: [
      [4, 10, ["krrrrrrwwrrrrrrk"]],
      [20, 9, ["rr.", ".rr"]],
    ],
  },
  // K-정 과다형: 밥을 꾹꾹 담은 공기를 내밀고 머리 위에 하트
  jeong: {
    shirt: "#f28fa5",
    layers: [
      [8, 17, ["..wwww..", "kuuuuuuk", ".kuuuuk.", "..kkkk.."]],
      [19, 3, ["r.r", "rrr", ".r."]],
    ],
  },
  // 호텔 직원형: 벨보이 모자와 나비넥타이
  hotel: {
    shirt: "#c0392b",
    layers: [
      [9, 6, ["kkkkkk", "krrrrk", "kyyyyk"]],
      [9, 17, ["kk..kk", "kkkkkk"]],
    ],
  },
  // 본의 아닌 팀장님형: 각진 안경, 빨간 넥타이, 결재 서류
  boss: {
    shirt: "#f4f1ea",
    layers: [
      [4, 10, [".kkkkkk..kkkkkk.", ".k....kkkk....k.", ".k....k..k....k.", ".kkkkkk..kkkkkk."]],
      [11, 17, ["rr", "rr", "rr", ".r"]],
      [1, 15, ["kkkkk", "kwwwk", "kekek", "kwwwk", "kekek", "kkkkk"]],
    ],
  },
  // 직역 장인형: 동그란 안경, 귀에 꽂은 연필, 두꺼운 사전
  literal: {
    shirt: "#9b7bd4",
    layers: [
      [4, 10, ["..dddd....dddd..", ".d....dddd....d.", ".d....d..d....d.", "..dddd....dddd.."]],
      [17, 5, ["...m", "..y.", ".y..", "k..."]],
      [9, 18, ["kkkkkk", "kdyydk", "kkkkkk"]],
    ],
  },
  // 말 오배송형: 택배 모자와 상자, 머리 위 물음표
  delivery: {
    shirt: "#7bc96f",
    layers: [
      [8, 7, ["..kkkkkk..", ".kggggggk.", "kggggggggkkk"]],
      [17, 14, ["kkkkkkk", "kttdttk", "kttdttk", "kttdttk", "kttdttk", "kttdttk", "kkkkkkk"]],
      [19, 1, ["kk.", "..k", ".k.", "...", ".k."]],
    ],
  },
};

function grid(type: TypeId) {
  const look = LOOKS[type];
  const cells: (string | null)[][] = Array.from({ length: CHAR_SIZE }, () => Array(CHAR_SIZE).fill(null));
  const put = (x: number, y: number, ch: string) => {
    if (ch === "." || ch === " " || x < 0 || y < 0 || x >= CHAR_SIZE || y >= CHAR_SIZE) return;
    cells[y][x] = ch === "S" ? look.shirt : ch === "A" ? (look.accent ?? look.shirt) : PALETTE[ch];
  };
  MOCHI.forEach((row, y) => [...row].forEach((ch, x) => put(x + OX, y + OY, ch)));
  look.layers.forEach(([lx, ly, rows]) => rows.forEach((row, y) => [...row].forEach((ch, x) => put(lx + x, ly + y, ch))));
  return cells;
}

// 같은 색이 이어진 칸을 묶어 색마다 path 하나로 그린다. silhouette이면 모든 칸을 한 색으로 칠해 도감의 '아직 못 만난 유형'으로 쓴다
export function characterSvg(type: TypeId, silhouette?: string) {
  const runs = new Map<string, string>();
  grid(type).forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const color = row[x] && (silhouette ?? row[x]);
      let n = 1;
      while (x + n < row.length && row[x + n] && (silhouette ?? row[x + n]) === color) n++;
      if (color) runs.set(color, `${runs.get(color) ?? ""}M${x} ${y}h${n}v1h-${n}z`);
      x += n;
    }
  });
  const paths = [...runs].map(([color, d]) => `<path fill="${color}" d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHAR_SIZE} ${CHAR_SIZE}" shape-rendering="crispEdges">${paths}</svg>`;
}

export function characterDataUrl(type: TypeId, silhouette?: string) {
  const svg = characterSvg(type, silhouette);
  return `data:image/svg+xml;base64,${typeof btoa === "function" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
}

export function shirtColor(type: TypeId) {
  return LOOKS[type].shirt;
}
