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
      aria-label={`${streak.current}일 연속${streak.today ? "" : ", 오늘 아직"}`}
      className={`flex h-11 items-center gap-1.5 px-2 font-pixel text-[15px] ${streak.today ? "text-paper" : "text-paper-subtle"}`}
    >
      <Flame lit={streak.today} size={16} />
      {streak.current}
    </Link>
  );
}
