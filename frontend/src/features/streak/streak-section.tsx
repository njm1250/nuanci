"use client";

import { setAvatar, useAvatar } from "@/features/avatar/avatar";
import { Panel } from "@/features/scene/block-ui";
import { badgeLabel, Flame, StreakBadge } from "./streak-ui";
import { useStreak } from "./streak";

const ALL_BADGES = [3, 7, 10, 30, 50, 100, 365];

// 내 정보의 연속 기록. 지금 이어 온 날, 가장 길었던 날, 얻은 뱃지를 보여주고 이름 옆에 달 뱃지를 고른다
export function StreakSection({ member }: { member: boolean }) {
  const streak = useStreak();
  const avatar = useAvatar();
  const current = streak?.current ?? 0;
  const earned = streak?.badges ?? [];

  // 단 뱃지를 다시 누르면 뗀다
  const pick = (days: number) => setAvatar({ ...avatar, badge: avatar.badge === days ? 0 : days }, true);

  return (
    <section id="streak" className="scroll-mt-4">
      <Panel>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Flame lit={Boolean(streak?.today)} size={32} />
            <div className="min-w-0 flex-1">
              <p className="font-pixel-title text-[24px] leading-none">{current}일 연속</p>
              <p className="mt-1.5 text-[13px] text-ink-subtle">가장 길게 {streak?.best ?? 0}일</p>
            </div>
          </div>
          <p className="mt-4 font-pixel text-[15px]">뱃지</p>
          <div role={member ? "radiogroup" : undefined} aria-label="이름 옆에 달 뱃지" className="mt-2 flex flex-wrap gap-2">
            {ALL_BADGES.map((days) => {
              const has = earned.includes(days);
              const on = avatar.badge === days;
              return member && has ? (
                <button
                  key={days}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={badgeLabel(days)}
                  onClick={() => pick(days)}
                  className={`grid min-h-11 place-items-center px-1 outline-offset-2 ${on ? "outline outline-[3px] outline-ink" : ""}`}
                >
                  <StreakBadge days={days} />
                </button>
              ) : (
                <span key={days} className="grid min-h-11 place-items-center px-1" aria-label={has ? badgeLabel(days) : `${badgeLabel(days)}, 아직`}>
                  <StreakBadge days={days} dim={!has} />
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-ink-subtle">{member ? "고른 뱃지가 이름 옆에 달려요" : "로그인하면 이름 옆에 달 수 있어요"}</p>
        </div>
      </Panel>
    </section>
  );
}
