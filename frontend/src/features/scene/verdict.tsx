import { TRAP_LABELS, type Choice, type Verdict } from "./types";

// 선택지 번호. 평소에는 테두리만 두고, 지금 고른 줄에만 먹색을 칠해 화면에서 먹색이 한 곳에만 남게 한다
// 고르기 전 보기에서는 손을 올리면 번호 칸이 먹색으로 뒤집히며 살짝 기운다
export function Num({ n, dark = false, hover = false }: { n: number; dark?: boolean; hover?: boolean }) {
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center font-pixel text-ui transition-transform duration-fast ${dark ? "bg-ink text-paper" : "border-2 border-ink/20 text-ink-muted"} ${hover ? "group-hover:-rotate-6 group-hover:border-ink group-hover:bg-ink group-hover:text-[#f6f4ee]" : ""}`}
    >
      {n}
    </span>
  );
}

// 고른 말의 판정. 초등학교 "참 잘했어요" 도장처럼 글자를 새긴 도장으로 찍어서 색만으로 구분하지 않는다
export const VERDICTS: Record<Verdict, { label: string; color: string; stamp: string }> = {
  good: { label: "자연스러워요", color: "bg-good", stamp: "참 잘했어요" },
  meh: { label: "상황에 따라 어색해요", color: "bg-warn", stamp: "애매해요" },
  bad: { label: "어색해요", color: "bg-bad", stamp: "사고 발생" },
};

// 살짝 기운 채로 찍히는 판정 도장. 픽셀 무대에 맞게 부드럽게 커지지 않고 몇 프레임으로 끊어서 쾅 찍힌다
export function VerdictStamp({ choice, pop = false }: { choice: Choice; pop?: boolean }) {
  const v = VERDICTS[choice.verdict];
  // 지금 보고 있는 줄에는 기호 옆에 판정 글자도 같이 찍는다
  return (
    <span
      role="img"
      aria-label={choice.trap ? `${v.label} · ${TRAP_LABELS[choice.trap]}` : v.label}
      className={`-rotate-6 shrink-0 whitespace-nowrap border-2 border-ink px-1.5 py-1 font-pixel-title text-meta leading-none text-ink outline-2 outline-offset-1 outline-ink ${v.color} ${pop ? "animate-stamp [animation-delay:60ms]" : ""}`}
    >
      {v.stamp}
    </span>
  );
}
