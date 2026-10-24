// 마스코트 Mochi(치즈 고양이)를 픽셀 격자로 그린다. 무대 밖(공유 카드, 화면 장식)에서 같은 그림을 쓴다
const PALETTE: Record<string, string> = {
  k: "#141317",
  o: "#f0a24a",
  c: "#ffd9b8",
  b: "#f28fa5",
  p: "#f08aa8",
  n: "#e86a88",
};

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
  "...kppppppppk...",
  ".kokppppppppkok.",
  ".kokppppppppkok.",
  "...kppppppppk...",
  "...kook..kook...",
  "...kkkk..kkkk...",
];

export const MOCHI_SIZE = { w: 16, h: MOCHI.length };

export function mochiPixels() {
  return MOCHI.flatMap((row, y) => [...row].flatMap((ch, x) => (PALETTE[ch] ? [{ x, y, color: PALETTE[ch] }] : [])));
}

export function mochiSvg() {
  const rects = mochiPixels()
    .map((p) => `<rect x="${p.x}" y="${p.y}" width="1" height="1" fill="${p.color}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MOCHI_SIZE.w} ${MOCHI_SIZE.h}" shape-rendering="crispEdges">${rects}</svg>`;
}
