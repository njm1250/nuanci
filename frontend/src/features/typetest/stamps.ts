// 문제마다 찍히는 작은 도장. 테스트 진행 칸, 결과 카드, 공유 이미지가 같은 그림을 쓴다.
// 답을 밝히지 않고 O·△·X 줄만 보여줘서, 친구가 같은 문제를 풀고 비교하게 만든다
export type StampKind = "good" | "meh" | "bad" | "time";

export const STAMP_COLORS: Record<StampKind, string> = { good: "#5be38a", meh: "#ffc24b", bad: "#ff6b6b", time: "#8ecbff" };

export const STAMP_LABELS: Record<StampKind, string> = { good: "자연스러워요", meh: "애매해요", bad: "사고 발생", time: "시간 초과" };

const ICONS: Record<StampKind, string[]> = {
  good: [".kkkkk.", "kk...kk", "k.....k", "k.....k", "k.....k", "kk...kk", ".kkkkk."],
  meh: ["...k...", "..k.k..", "..k.k..", ".k...k.", ".k...k.", "k.....k", "kkkkkkk"],
  bad: ["k.....k", ".k...k.", "..k.k..", "...k...", "..k.k..", ".k...k.", "k.....k"],
  time: [".kkkkk.", "k..k..k", "k..k..k", "k..kk.k", "k.....k", "k.....k", ".kkkkk."],
};

export function stampPath(kind: StampKind) {
  return ICONS[kind].flatMap((row, y) => [...row].flatMap((ch, x) => (ch === "k" ? [`M${x} ${y}h1v1h-1z`] : []))).join("");
}

export function stampSvg(kind: StampKind, ink = "#141317") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 7" shape-rendering="crispEdges"><path fill="${ink}" d="${stampPath(kind)}"/></svg>`;
}

export function stampKind(verdict: "good" | "meh" | "bad" | null): StampKind {
  return verdict ?? "time";
}
