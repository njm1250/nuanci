import type { Expression } from "@/features/scene/types";

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
  dizzy: (
    <svg width="40" height="20" viewBox="0 0 20 10" shapeRendering="crispEdges" fill="#e1ad34" stroke="currentColor" strokeWidth="0.6">
      <path d="M3 1h1v2h2v1h-2v2h-1v-2h-2v-1h2z M10 3h1v2h2v1h-2v2h-1v-2h-2v-1h2z M16 0h1v2h2v1h-2v2h-1v-2h-2v-1h2z" />
    </svg>
  ),
};
