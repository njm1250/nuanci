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
