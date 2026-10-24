import type { Expression } from "@/features/scene/types";

// 하얀 유령 픽셀. k는 외곽선·눈, w는 몸
const SOUL = [
  "...kkkkk...",
  "..kwwwwwk..",
  ".kwwwwwwwk.",
  "kwwkwwwkwwk",
  "kwwkwwwkwwk",
  "kwwwwwwwwwk",
  "kwwwwkwwwwk",
  "kwwwwwwwwwk",
  "kwkwwkwwkwk",
  "kk.kk.kk.kk",
];

function Soul() {
  return (
    <svg width="33" height="30" viewBox="0 0 11 10" shapeRendering="crispEdges" className="animate-[soul_1400ms_ease-out_both]" aria-hidden>
      {SOUL.flatMap((row, y) =>
        [...row].map((cell, x) => (cell === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={cell === "k" ? "#141317" : "#f4f7ff"} />)),
      )}
    </svg>
  );
}

export const REACTION_SYMBOLS: Partial<Record<Expression, React.ReactNode>> = {
  puzzled: <span className="text-[30px] font-bold leading-none">?</span>,
  delighted: <span className="text-[30px] font-bold leading-none">!</span>,
  // 기분 좋음: 픽셀 음표
  happy: (
    <svg width="21" height="27" viewBox="0 0 7 9" shapeRendering="crispEdges" fill="currentColor">
      <path d="M4 0h3v1h-1v1h-1v4h-1z M1 6h3v1h1v1h-1v1h-3v-1h-1v-1h1z" />
    </svg>
  ),
  awkward: (
    <svg width="18" height="26" viewBox="0 0 18 26">
      <path d="M9 2 C13 10 16 14 16 18 A7 7 0 0 1 2 18 C2 14 5 10 9 2Z" fill="#7fb4d8" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  neutral: <span className="text-[24px] font-bold leading-none tracking-widest">…</span>,
  // 기절: 머리 위로 영혼이 스르륵 빠져나간다
  dizzy: <Soul />,
};
