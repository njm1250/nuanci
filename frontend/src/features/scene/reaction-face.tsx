import { C } from "@/features/stage/palette";
import type { Expression } from "./types";

const OUTLINE = [
    "..kkkkkk..",
    ".kssssssk.",
    "kssssssssk",
    "kssssssssk",
    "kssssssssk",
    "kspsssspsk",
    "kssssssssk",
    "kssssssssk",
    ".kssssssk.",
    "..kkkkkk..",
];

// 표정별로 얼굴 안쪽에 찍을 점. [행, 열, 색]
const FEATURES: Record<Expression, [number, number, string][]> = {
    neutral: [
        [3, 2, "w"], [3, 3, "k"], [4, 2, "k"], [4, 3, "k"],
        [3, 6, "w"], [3, 7, "k"], [4, 6, "k"], [4, 7, "k"],
        [6, 4, "k"], [6, 5, "k"],
    ],
    happy: [
        [3, 2, "w"], [3, 3, "k"], [4, 2, "k"], [4, 3, "k"],
        [3, 6, "w"], [3, 7, "k"], [4, 6, "k"], [4, 7, "k"],
        [6, 3, "k"], [6, 6, "k"], [7, 4, "k"], [7, 5, "k"],
    ],
    delighted: [
        [3, 3, "k"], [4, 2, "k"], [4, 4, "k"],
        [3, 6, "k"], [4, 5, "k"], [4, 7, "k"],
        [6, 3, "k"], [6, 4, "k"], [6, 5, "k"], [6, 6, "k"],
        [7, 4, "r"], [7, 5, "r"],
    ],
    puzzled: [
        [2, 6, "k"], [2, 7, "k"],
        [3, 2, "w"], [3, 3, "k"], [4, 2, "k"], [4, 3, "k"],
        [3, 6, "w"], [3, 7, "k"], [4, 6, "k"], [4, 7, "k"],
        [7, 4, "k"], [7, 5, "k"], [7, 6, "k"],
    ],
    awkward: [
        [3, 2, "w"], [3, 3, "k"], [4, 2, "k"], [4, 3, "k"],
        [3, 6, "w"], [3, 7, "k"], [4, 6, "k"], [4, 7, "k"],
        [7, 3, "k"], [6, 4, "k"], [7, 5, "k"], [6, 6, "k"],
        [2, 7, "b"], [3, 8, "b"], [4, 8, "b"],
    ],
    stuffed: [
        [4, 2, "k"], [4, 3, "k"], [4, 6, "k"], [4, 7, "k"],
        [5, 1, "r"], [5, 2, "p"], [5, 7, "p"], [5, 8, "r"],
        [7, 4, "k"], [7, 5, "k"],
    ],
    love: [
        [3, 2, "r"], [3, 4, "r"], [4, 3, "r"],
        [3, 5, "r"], [3, 7, "r"], [4, 6, "r"],
        [6, 3, "k"], [6, 6, "k"], [7, 4, "k"], [7, 5, "k"],
    ],
    angry: [
        [2, 2, "k"], [3, 3, "k"], [2, 7, "k"], [3, 6, "k"],
        [4, 2, "k"], [4, 3, "k"], [4, 6, "k"], [4, 7, "k"],
        [7, 3, "k"], [6, 4, "k"], [6, 5, "k"], [7, 6, "k"],
    ],
    shocked: [
        [3, 2, "w"], [3, 3, "k"], [4, 2, "k"], [4, 3, "k"],
        [3, 6, "w"], [3, 7, "k"], [4, 6, "k"], [4, 7, "k"],
        [6, 4, "k"], [6, 5, "k"], [7, 4, "r"], [7, 5, "r"],
    ],
    sleepy: [
        [4, 2, "k"], [4, 3, "k"], [4, 6, "k"], [4, 7, "k"],
        [7, 4, "k"], [7, 5, "k"], [8, 6, "b"],
    ],
    crying: [
        [4, 2, "k"], [4, 3, "k"], [4, 6, "k"], [4, 7, "k"],
        [5, 2, "b"], [6, 2, "b"], [7, 2, "b"],
        [5, 7, "b"], [6, 7, "b"], [7, 7, "b"],
        [7, 4, "k"], [7, 5, "k"],
    ],
    dizzy: [
        [3, 2, "k"], [3, 4, "k"], [4, 3, "k"], [5, 2, "k"], [5, 4, "k"],
        [3, 5, "k"], [3, 7, "k"], [4, 6, "k"], [5, 5, "k"], [5, 7, "k"],
        [7, 4, "k"], [7, 5, "k"],
    ],
};

const FILL: Record<string, string> = {
    k: C.ink,
    s: "#ffe3ca",
    p: "#ff7aa2",
    w: "#ffffff",
    r: "#ff5c8a",
    b: "#5bc0ff",
};

// 상대 반응을 10×10 치비 도트 얼굴로 보여준다
export function ReactionFace({ expression, size = 20 }: { expression: Expression; size?: number }) {
    const grid = OUTLINE.map((row) => row.split(""));
    for (const [r, c, color] of FEATURES[expression]) grid[r][c] = color;
    return (
        <svg width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden className="shrink-0">
            {grid.flatMap((row, r) => row.map((cell, c) => (cell === "." ? null : <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={FILL[cell]} />)))}
        </svg>
    );
}
