import { C } from "@/features/stage/palette";
import type { Expression } from "./types";

const OUTLINE = ["..kkkkkk..", ".kssssssk.", "kssssssssk", "kssssssssk", "kssssssssk", "kssssssssk", "kssssssssk", "kssssssssk", ".kssssssk.", "..kkkkkk.."];

// 표정별로 얼굴 안쪽에 찍을 점. [행, 열, 색]
const FEATURES: Record<Expression, [number, number, string][]> = {
  neutral: [[4, 3, "k"], [4, 6, "k"], [7, 4, "k"], [7, 5, "k"]],
  happy: [[4, 3, "k"], [4, 6, "k"], [6, 3, "k"], [6, 6, "k"], [7, 4, "k"], [7, 5, "k"]],
  delighted: [[3, 3, "k"], [4, 2, "k"], [4, 4, "k"], [3, 6, "k"], [4, 5, "k"], [4, 7, "k"], [6, 3, "k"], [6, 4, "k"], [6, 5, "k"], [6, 6, "k"], [7, 4, "r"], [7, 5, "r"]],
  puzzled: [[2, 6, "k"], [2, 7, "k"], [4, 3, "k"], [4, 6, "k"], [7, 4, "k"], [7, 5, "k"], [7, 6, "k"]],
  awkward: [[4, 3, "k"], [4, 6, "k"], [7, 3, "k"], [6, 4, "k"], [7, 5, "k"], [6, 6, "k"], [2, 7, "b"], [3, 7, "b"], [3, 8, "b"]],
  stuffed: [[4, 2, "k"], [4, 3, "k"], [4, 6, "k"], [4, 7, "k"], [5, 1, "r"], [5, 8, "r"], [7, 4, "k"], [7, 5, "k"]],
  dizzy: [[3, 2, "k"], [3, 4, "k"], [4, 3, "k"], [5, 2, "k"], [5, 4, "k"], [3, 5, "k"], [3, 7, "k"], [4, 6, "k"], [5, 5, "k"], [5, 7, "k"], [7, 4, "k"], [7, 5, "k"]],
};

const FILL: Record<string, string> = { k: C.ink, s: C.skin, r: "#d9826b", b: "#7fb4d8" };

// 상대 반응을 10×10 도트 얼굴로 보여준다
export function ReactionFace({ expression, size = 20 }: { expression: Expression; size?: number }) {
  const grid = OUTLINE.map((row) => row.split(""));
  for (const [r, c, color] of FEATURES[expression]) grid[r][c] = color;
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden className="shrink-0">
      {grid.flatMap((row, r) => row.map((cell, c) => (cell === "." ? null : <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={FILL[cell]} />)))}
    </svg>
  );
}
