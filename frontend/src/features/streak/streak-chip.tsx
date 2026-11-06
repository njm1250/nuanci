"use client";

import Link from "next/link";
import { Flame } from "./streak-ui";
import { useStreak } from "./streak";

// 홈 머리말의 연속 기록. 오늘 했으면 불이 붙고, 아직이면 꺼진 불꽃 옆에 이어 온 날 수가 남는다
export function StreakChip() {
  const streak = useStreak();
  if (!streak || (streak.current === 0 && streak.best === 0)) return null;
  return (
    <Link
      href="/me#streak"
      className={`flex h-11 items-center gap-1.5 px-2 font-pixel text-ui ${streak.today ? "text-paper" : "text-paper-subtle"}`}
    >
      <Flame lit={streak.today} size={16} />
      {/* 화면에 보이는 숫자가 읽어 주는 이름에도 그대로 들어가게, 나머지 말은 화면 밖 글자로 붙인다 */}
      <span className="sr-only">연속 기록 </span>
      {streak.current}
      <span className="sr-only">일{streak.today ? "" : ", 오늘 아직"}</span>
    </Link>
  );
}
