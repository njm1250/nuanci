// 로고 마크: 고개를 갸웃한 귀 달린 핑크 말풍선. 파비콘, 앱 아이콘, 공유 카드가 같은 그림을 쓴다
const PALETTE: Record<string, string> = {
  o: "#fd91cc",
  k: "#0b1a44",
};

// 오른쪽 귀와 눈이 두 칸 낮다. 모서리는 한두 칸씩 깎아 둥글게 보이게 한다
const LOGO = [
  ".oo.......................",
  "oooo......................",
  "ooooo..................oo.",
  "oooooo................oooo",
  "ooooooo..............ooooo",
  "oooooooo............oooooo",
  "ooooooooo..........ooooooo",
  "oooooooooooooooooooooooooo",
  "oooooooooooooooooooooooooo",
  "oooooooooooooooooooooooooo",
  "oooooooooooooooooooooooooo",
  "oooooooooooooooooooooooooo",
  "oooooooooooooooooooooooooo",
  "oooookkkkooooooooooooooooo",
  "oooookkkkooooooooooooooooo",
  "oooookkkkooooooookkkkooooo",
  "oooookkkkooooooookkkkooooo",
  "oooooooooooooooookkkkooooo",
  "oooooooooooooooookkkkooooo",
  "oooooooooooooooooooooooooo",
  ".ooooooooooooooooooooooooo",
  ".ooooooooooooooooooooooooo",
  "..ooooooooooooooooooooooo.",
  "...oooooooooooooooooooooo.",
  "...ooooooooooooooooooooo..",
  "...oooooo.....oooooooo....",
  "...oooo...................",
  "...oo.....................",
];

// 32px 이하에서 쓰는 작은 그림. 큰 그림을 줄이면 눈이 뭉개져서 굵은 격자로 따로 그렸다
const LOGO_SMALL = [
  "o...........o.",
  "oo.........oo.",
  "ooo.......ooo.",
  "oooo......oooo",
  "oooooooooooooo",
  "oooooooooooooo",
  "ookkooooookkoo",
  "ookkooooookkoo",
  "oooooooooooooo",
  "oooooooooooooo",
  ".oooooooooooo.",
  "..ooo.........",
  ".oo...........",
];

export const LOGO_SIZE = { w: LOGO[0].length, h: LOGO.length };
export const LOGO_SMALL_SIZE = { w: LOGO_SMALL[0].length, h: LOGO_SMALL.length };

// 같은 색이 이어진 칸을 한 줄로 묶어서 색마다 path 하나로 그린다. 파비콘으로 받는 크기를 줄이려고
function gridSvg(rows: string[], palette: Record<string, string>) {
  const runs = new Map<string, string>();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      let n = 1;
      while (row[x + n] === row[x]) n++;
      if (palette[row[x]]) runs.set(row[x], `${runs.get(row[x]) ?? ""}M${x} ${y}h${n}v1h-${n}z`);
      x += n;
    }
  });
  const paths = [...runs].map(([ch, d]) => `<path fill="${palette[ch]}" d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges">${paths}</svg>`;
}

const dataUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export const logoSvg = () => gridSvg(LOGO, PALETTE);
export const logoDataUrl = () => dataUrl(logoSvg());
export const logoSmallSvg = () => gridSvg(LOGO_SMALL, PALETTE);
export const logoSmallDataUrl = () => dataUrl(logoSmallSvg());

// 글자 로고 "nuanci". 제목 글꼴(던파 비트비트체 v2, NEOPLE)의 글자를 고치지 않고 격자 그대로 옮겼다. 글꼴 파일 없이 SVG로 그린다
// 마크와 칸 크기가 같다. 글자 밑줄은 마크의 26번째 줄(몸통 밑)에 맞춘다
const WORDMARK = [
  ".....................................................................................xxx.",
  "....................................................................................xxxxx",
  "....................................................................................xxxxx",
  "....................................................................................xxxxx",
  ".....................................................................................xxx.",
  ".xxx.xxxxxxx......xxxx......xxx.....xxxxxxxxxxx.....xxx.xxxxxxx.........xxxxxxxxx........",
  "xxxxxxxxxxxxx....xxxxxx....xxxxx...xxxxxxxxxxxxx...xxxxxxxxxxxxx......xxxxxxxxxxxx.......",
  "xxxxxxxxxxxxxx...xxxxxx....xxxxx...xxxxxxxxxxxxxx..xxxxxxxxxxxxxx....xxxxxxxxxxxxx...xxx.",
  "xxxxxxxxxxxxxxx..xxxxxx....xxxxx....xxxxxxxxxxxxx..xxxxxxxxxxxxxxx..xxxxxxxxxxxxxx..xxxxx",
  "xxxxxxxxxxxxxxx..xxxxxx....xxxxx............xxxxx..xxxxxxxxxxxxxxx..xxxxxxxxxxxxx...xxxxx",
  "xxxxxx...xxxxxx..xxxxxx....xxxxx............xxxxx..xxxxxx...xxxxxx..xxxxxxx.........xxxxx",
  "xxxxx.....xxxxx..xxxxxx....xxxxx.....xxxxxxxxxxxx..xxxxx.....xxxxx..xxxxxx..........xxxxx",
  "xxxxx.....xxxxx..xxxxxx....xxxxx....xxxxxxxxxxxxx..xxxxx.....xxxxx..xxxxxx..........xxxxx",
  "xxxxx.....xxxxx..xxxxxx....xxxxx...xxxxxxxxxxxxxx..xxxxx.....xxxxx..xxxxxx..........xxxxx",
  "xxxxx.....xxxxx..xxxxxx....xxxxx..xxxxxxxxxxxxxxx..xxxxx.....xxxxx..xxxxxx..........xxxxx",
  "xxxxx.....xxxxx..xxxxxx....xxxxx..xxxxxx....xxxxx..xxxxx.....xxxxx..xxxxxx..........xxxxx",
  "xxxxx.....xxxxx..xxxxxxx..xxxxxx..xxxxx.....xxxxx..xxxxx.....xxxxx..xxxxxxx.........xxxxx",
  "xxxxx.....xxxxx..xxxxxxxxxxxxxxx..xxxxxx....xxxxx..xxxxx.....xxxxx..xxxxxxxxxxxxx...xxxxx",
  "xxxxx.....xxxxx...xxxxxxxxxxxxxx..xxxxxxxxxxxxxxx..xxxxx.....xxxxx..xxxxxxxxxxxxxx..xxxxx",
  "xxxxx.....xxxxx...xxxxxxxxxxxxxx...xxxxxxxxxxxxxx..xxxxx.....xxxxx...xxxxxxxxxxxxx..xxxxx",
  "xxxxx.....xxxxx....xxxxxxxxxxxxx....xxxxxxxxxxxxx..xxxxx.....xxxxx....xxxxxxxxxxxx..xxxxx",
  ".xxx.......xxx.......xxxxxx.xxx......xxxxxxxxxxx....xxx.......xxx.......xxxxxxxxx....xxx.",
];

export const WORDMARK_SIZE = { w: WORDMARK[0].length, h: WORDMARK.length };
// 마크와 나란히 둘 때 글자를 마크 위에서 몇 칸 내리는지
export const WORDMARK_DROP = 3;

export const wordmarkSvg = (color = PALETTE.o) => gridSvg(WORDMARK, { x: color });
export const wordmarkDataUrl = (color?: string) => dataUrl(wordmarkSvg(color));
