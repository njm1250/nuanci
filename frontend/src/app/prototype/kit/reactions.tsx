import type { Expression } from "../scene";

export const REACTION_SYMBOLS: Partial<Record<Expression, React.ReactNode>> = {
  puzzled: <span className="text-[30px] font-bold leading-none">?</span>,
  delighted: <span className="text-[30px] font-bold leading-none">!</span>,
  happy: (
    <svg width="34" height="22" viewBox="0 0 34 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
      <path d="M4 16 L9 6 M17 14 L17 2 M30 16 L25 6" />
    </svg>
  ),
  awkward: (
    <svg width="18" height="26" viewBox="0 0 18 26">
      <path d="M9 2 C13 10 16 14 16 18 A7 7 0 0 1 2 18 C2 14 5 10 9 2Z" fill="#7fb4d8" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  neutral: <span className="text-[24px] font-bold leading-none tracking-widest">…</span>,
};
