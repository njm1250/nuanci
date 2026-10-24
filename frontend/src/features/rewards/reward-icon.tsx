import { COLOR_HEX, type RewardColor } from "./rewards";

// 보상 아이템의 12×12 픽셀 아이콘. c는 고른 색이 들어가는 자리다
const INK: Record<string, string> = {
  k: "#1b1b1a",
  w: "#f2f0eb",
  y: "#e8b931",
  g: "#4f7a4a",
  b: "#bfe3f2",
  o: "#f08a24",
  r: "#b4452f",
  p: "#f08aa8",
  n: "#7a4a22",
  m: "#8c9296",
  d: "#7a3c21",
  s: "#e6bf98",
  u: "#f2d34a",
};

const ICONS: Record<string, string[]> = {
  cap: ["", "", ".....kk.....", "....cccc....", "...cccccc...", "..cccccccc..", "..cccccccc..", "..cccccccccc", "..kkkkkkkkkk"],
  glasses: ["", "", "", "", "ccccc..ccccc", ".cbbccccbbc.", ".cbbc..cbbc.", ".cccc..cccc."],
  headphones: ["", "...kkkkkk...", "..k......k..", ".k........k.", ".k........k.", "cc........cc", "cc........cc", "cc........cc", ".c........c."],
  crown: ["", "", "y....yy....y", "yy..yyyy..yy", "yyy.yyyy.yyy", "yyyyyyyyyyyy", "yyryyyyyyryy", "yyyyyyyyyyyy"],
  plant: [".....g......", "...g.gg.g...", "...gggggg...", "..gggggggg..", "...gggggg...", ".....gg.....", "...rrrrrr...", "...rrrrrr...", "....rrrr....", "....rrrr...."],
  poster: ["..kkkkkkkk..", "..rrrrrrrr..", "..rryyyyrr..", "..rryyyyrr..", "..rryyyyrr..", "..rrrrrrrr..", "..rrwwwwrr..", "..rrrrrrrr..", "..rrrrrrrr.."],
  pudding: ["", "", "....nnnn....", "...nnnnnn...", "...uuuuuu...", "..uuuuuuuu..", "..uuuuuuuu..", ".uuuuuuuuuu.", "wwwwwwwwwwww"],
  fishbowl: ["", "...kkkkkk...", "..bbbbbbbb..", ".bbbbbbbbbb.", ".bbboobbbbb.", ".bboooobbbb.", ".bbboobbbbb.", "..bbbbbbbb..", "...dddddd..."],
  cake: [".....y......", ".....r......", "..wwwwwwww..", "..pppppppp..", "..wwwwwwww..", "..pppppppp..", ".wwwwwwwwww."],
  mic: ["....mmmm....", "...mmmmmm...", "...mmmmmm...", "....mmmm....", ".....kk.....", ".....kk.....", ".....kk.....", ".....kk.....", "....kkkk...."],
  frame: ["", ".dddddddddd.", ".dbbbbbbbbd.", ".dbsbbbbsbd.", ".dbrbbbbobd.", ".dbrbbbbobd.", ".dggggggggd.", ".dddddddddd."],
  rug: ["", "", "", "pppppppppppp", "pwpwpwpwpwpw", "pppppppppppp", "pwpwpwpwpwpw", "pppppppppppp"],
  lamp: ["...yyyyyy...", "..yyyyyyyy..", ".yyyyyyyyyy.", ".....kk.....", ".....kk.....", ".....kk.....", ".....kk.....", ".....kk.....", ".....kk.....", "...kkkkkk..."],
  trophy: ["..yyyyyyyy..", "yyyyyyyyyyyy", "y.yyyyyyyy.y", ".yyyyyyyyyy.", "...yyyyyy...", ".....yy.....", ".....yy.....", "...kkkkkk...", "...kkkkkk..."],
  clock: ["....kkkk....", "..kkwwwwkk..", ".kwwwkwwwwk.", ".kwwwkwwwwk.", "kwwwwkwwwwwk", "kwwwwkkkkwwk", "kwwwwwwwwwwk", ".kwwwwwwwwk.", ".kwwwwwwwwk.", "..kkwwwwkk..", "....kkkk...."],
  box: ["", ".nnnnnnnnnn.", ".nddddddddn.", ".nnnnnnnnnn.", ".nnnwwwnnnn.", ".nnnnnwnnnn.", ".nnnnwnnnnn.", ".nnnnnnnnnn.", ".nnnnwnnnnn.", ".nnnnnnnnnn."],
  locked: ["", "", "....kkkk....", "...k....k...", "...k....k...", "..kkkkkkkk..", "..kkkwwkkk..", "..kkkwwkkk..", "..kkkkkkkk.."],
};

export function RewardIcon({ id, color, size = 36, className }: { id: string; color?: RewardColor | null; size?: number; className?: string }) {
  const rows = ICONS[id] ?? ICONS.locked;
  // 아이콘마다 줄 수가 달라서 세로 가운데에 놓는다
  const top = Math.floor((12 - rows.length) / 2);
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== ".") {
        const fill = ch === "c" ? COLOR_HEX[color ?? "red"] : INK[ch];
        rects.push(<rect key={`${y}-${x}`} x={x} y={y + top} width={end - x} height={1} fill={fill} />);
      }
      x = end;
    }
  });
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden className={className}>
      {rects}
    </svg>
  );
}
