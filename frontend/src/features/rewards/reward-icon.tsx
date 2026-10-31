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
  t: "#2f7f7a",
  e: "#e3d3b0",
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
  beanie: [".....ww.....", "....cccc....", "...cccccc...", "..cccccccc..", "..cccccccc..", ".cccccccccc.", ".wwwwwwwwww.", ".wwwwwwwwww."],
  "cat-ears": ["", ".c........c.", ".cc......cc.", ".cpc....cpc.", ".cppc..cppc.", ".cccccccccc.", "cc........cc"],
  flower: ["....cccc....", "...cccccc...", "..cccyyccc..", "..ccyyyycc..", "..ccyyyycc..", "..cccyyccc..", "...cccccc...", "....cccc....", ".....gg.....", ".....gg....."],
  sunglasses: ["", "", "", "", "kkkkkkkkkkkk", ".kwkk..kwkk.", ".kkkk..kkkk.", "..kk....kk.."],
  scarf: ["", "..cccccccc..", ".cccccccccc.", ".cwcwcwcwcc.", ".cccccccccc.", "......ccc...", "......ccc...", "......cwc...", "......ccc..."],
  bowtie: ["", "", "cc........cc", "cccc.kk.cccc", "ccccckkccccc", "cccc.kk.cccc", "cc........cc"],
  badge: ["..t......t..", "...t....t...", "....t..t....", ".....tt.....", "...wwwwww...", "...tttttt...", "...wwwwww...", "...wkkkkw...", "...wwwwww..."],
  gamepad: ["", "", "..kkkkkkkk..", ".kkkkkkkkkk.", "kkwkkkkkrkkk", "kwwwkkkrkrkk", "kkwkkkkkrkkk", "kkkk....kkkk", ".kk......kk."],
  dumbbell: ["", "", "", "kk........kk", "kkk......kkk", "kkkmmmmmmkkk", "kkk......kkk", "kk........kk"],
  ramen: ["", "..wwwwwwww..", ".rrrrrrrrrr.", "..rrrrrrrr..", "..rwwwwwwr..", "..rwyywwwr..", "..rrrrrrrr..", "...rrrrrr...", "...rrrrrr..."],
  camera: ["", "", "...kkk......", ".kkkkkkkkkk.", ".kmmmmmmmmk.", ".kmmkkkkmmk.", ".kmkbbbbkmk.", ".kmkbbbbkmk.", ".kmmkkkkmmk.", ".kkkkkkkkkk."],
  vase: ["..p..r..p...", ".ppp.rrppp..", "..p..r..p...", "..g..g..g...", "...g.g.g....", "....ggg.....", "...bbbbb....", "..bbbbbbb...", "..bbbbbbb...", "...bbbbb...."],
  mirror: ["....dddd....", "...dbbbbd...", "..dbbwbbbd..", "..dbwbbbbd..", "..dbbbbbbd..", "..dbbbbbbd..", "..dbbbbbbd..", "...dbbbbd...", "....dddd....", "....dddd....", "...dddddd..."],
  coffee: ["...m..m.....", "....m..m....", "..ttttttt...", "..tnnnnnttt.", "..ttttttt.t.", "..ttttttttt.", "..ttttttt...", "...ttttt....", ".ttttttttt.."],
  mirrorball: [".....kk.....", ".....kk.....", "....mmmm....", "...mwmmwm...", "..mmmwmmmm..", "..mwmmmmwm..", "..mmmmwmmm..", "...mwmmmm...", "....mmmm...."],
  guitar: ["........kk..", ".......kk...", "......nk....", ".....nn.....", "..oooo......", ".oookoo.....", ".ookkko.....", ".oookoo.....", "..ooo......."],
  lights: ["", "", "kk........kk", "y.kk....kk.b", "y...kkkk...b", "...r.yy.p...", "...r.yy.p..."],
  beanbag: ["", "", "", "...oooooo...", "..oooooooo..", ".oooooooooo.", "oooooooooooo", "oooooooooooo", ".oooooooooo."],
  "hair-bob": ["...cccccc...", "..cccccccc..", ".cccccccccc.", ".ccsssssscc.", ".ccskssskcc.", ".ccsssssscc.", ".ccsssssscc.", ".cc......cc."],
  "hair-twintail": ["...cccccc...", "..cccccccc..", "ppccssssccpp", "ccccskskcccc", "cc.ssssss.cc", "cc........cc", ".c........c."],
  "hair-ribbon": [".ppp.kk.ppp.", ".pppkkkkppp.", "...cccccc...", "..cccccccc..", ".ccsssssscc.", ".ccskssskcc.", ".cc.ssss.cc.", ".cc......cc.", ".cc......cc."],
  "hair-spacebuns": [".cc......cc.", "cccc....cccc", "cccc.cc.cccc", ".pccccccccp.", "..cccccccc..", "..cssssssc..", "..cskssksc..", "...ssssss..."],
  "hair-sidepony": ["...cccccc.cc", "..ccccccccpc", "..cccccccccc", "..csssssc.cc", "..cskssks.cc", "..cssssss.cc", "...ssssss.c.", "..........c."],
  "hair-wave": ["...cccccc...", "..cccccccc..", ".ccsssssscc.", ".ccskssskcc.", "cc.ssssss.cc", ".cc......cc.", "cc........cc", ".cc......cc."],
  // 생각 말풍선(상대가 오해해서 떠올린 그림)에 쓰는 그림
  "imagine-food": ["....nnnn....", "...wwwwww...", "...nnnnnn...", "..wwwwwwww..", "..nnnnnnnn..", ".wwwwwwwwww.", ".nnnnnnnnnn.", "nnnnnnnnnnnn"],
  "imagine-stomachs": [".pppp..pppp.", "pppppppppppp", "pppprppprppp", "pppppppppppp", ".pppp..pppp.", "..pp....pp..", "...p....p..."],
  "imagine-net": ["......kkkk..", ".....k....k.", ".....k.bb.k.", ".....k....k.", "......kkkk..", ".....k......", "....k.......", "...k........", "..k.........", ".k.........."],
  "imagine-bone": ["..ee....ee..", ".eeee..eeee.", ".eeeeeeeeee.", "..eeeeeeee..", "..eeeeeeee..", ".eeeeeeeeee.", ".eeee..eeee.", "..ee....ee.."],
  "imagine-empty-cup": ["..........k.", ".........k..", "........k...", "..mmmmmkmm..", "..m...k..m..", "..m..k...m..", "...mk...m...", "...mmmmmm..."],
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
