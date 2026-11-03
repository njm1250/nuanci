// 로고 마크: Mochi 귀가 달린 라임 말풍선. 파비콘, 앱 아이콘, 공유 카드가 같은 격자를 쓴다
const PALETTE: Record<string, string> = {
  k: "#141317",
  o: "#c8f031",
  b: "#f28fa5",
};

const LOGO = [
  "..k..........k..",
  ".kok........kok.",
  ".kook......kook.",
  ".koookkkkkkoook.",
  "kooooooooooooook",
  "kooooooooooooook",
  "kookkooooookkook",
  "kookkooooookkook",
  "kobboooooooobbok",
  "kooooookkooooook",
  ".kooooooooooook.",
  "..kookkkkkkkkk..",
  "..kok...........",
  ".kok............",
  ".kk.............",
  "................",
];

export const LOGO_SIZE = { w: 16, h: LOGO.length };

// 같은 색이 이어진 칸을 한 줄로 묶어서 색마다 path 하나로 그린다. 파비콘으로 받는 크기를 줄이려고
export function logoSvg() {
  const runs = new Map<string, string>();
  LOGO.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      let n = 1;
      while (row[x + n] === row[x]) n++;
      if (PALETTE[row[x]]) runs.set(row[x], `${runs.get(row[x]) ?? ""}M${x} ${y}h${n}v1h-${n}z`);
      x += n;
    }
  });
  const paths = [...runs].map(([ch, d]) => `<path fill="${PALETTE[ch]}" d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE.w} ${LOGO_SIZE.h}" shape-rendering="crispEdges">${paths}</svg>`;
}

export function logoDataUrl() {
  return `data:image/svg+xml;base64,${Buffer.from(logoSvg()).toString("base64")}`;
}

// 글자 로고 "nuanci". 마크와 같은 도트 격자에 직접 그려서 획 두께가 마크 외곽선과 맞는다. 글꼴 파일 없이 SVG로 그린다
// x-높이 7칸, 획 2칸, 글자 사이 1칸. i의 점은 위로 2칸 띄워 올린다
const GLYPHS: Record<string, string[]> = {
  n: ["xxxxx.", "xxxxxx", "xx..xx", "xx..xx", "xx..xx", "xx..xx", "xx..xx"],
  u: ["xx..xx", "xx..xx", "xx..xx", "xx..xx", "xx..xx", "xxxxxx", ".xxxxx"],
  a: [".xxxx.", "....xx", ".xxxxx", "xx..xx", "xx..xx", "xxxxxx", ".xxxxx"],
  c: [".xxxxx", "xxxxxx", "xx....", "xx....", "xx....", "xxxxxx", ".xxxxx"],
  i: ["xx", "xx", "xx", "xx", "xx", "xx", "xx"],
};
const DOT = 2;
const TOP = DOT + 1;
const WORD = (() => {
  let x = 0;
  let d = "";
  for (const ch of "nuanci") {
    const g = GLYPHS[ch];
    g.forEach((row, y) => {
      for (let c = 0; c < row.length; ) {
        let n = 0;
        while (row[c + n] === "x") n++;
        if (n) d += `M${x + c} ${TOP + y}h${n}v1h-${n}z`;
        c += n || 1;
      }
    });
    if (ch === "i") d += `M${x} 0h2v${DOT}h-2z`;
    x += g[0].length + 1;
  }
  return { d, w: x - 1, h: TOP + GLYPHS.n.length };
})();

export const WORDMARK_SIZE = { w: WORD.w, h: WORD.h };

export function wordmarkSvg(color = PALETTE.o) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WORD.w} ${WORD.h}" shape-rendering="crispEdges"><path fill="${color}" d="${WORD.d}"/></svg>`;
}

export function wordmarkDataUrl(color?: string) {
  return `data:image/svg+xml;base64,${Buffer.from(wordmarkSvg(color)).toString("base64")}`;
}
