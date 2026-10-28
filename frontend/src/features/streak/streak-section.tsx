"use client";

import { setAvatar, useAvatar } from "@/features/avatar/avatar";
import { Panel } from "@/features/scene/block-ui";
import { badgeLabel, Flame, Medal } from "./streak-ui";
import { kstNoon, useKstDay } from "./kst-day";
import { useStreak } from "./streak";

const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "narrow", timeZone: "Asia/Seoul" });

// 최근 7일의 요일 이름(한국 시간). 마지막이 오늘이다. 날짜를 모르는 서버에서는 비워 둔다
function weekLabels(today: number | null) {
  return Array.from({ length: 7 }, (_, i) => (today === null ? "" : weekday.format(kstNoon(today - 6 + i))));
}

// 내 정보의 연속 기록. 지금 이어 온 날과 최근 일주일, 다음 뱃지까지 남은 날, 모은 뱃지를 보여준다.
// 모든 뱃지 단계를 늘어놓지 않고 바로 다음 목표 하나만 보여준다. 모은 뱃지를 누르면 이름 옆에 달리고, 다시 누르면 뗀다
export function StreakSection({ member }: { member: boolean }) {
  const streak = useStreak();
  const avatar = useAvatar();
  const current = streak?.current ?? 0;
  const week = streak?.week ?? Array<boolean>(7).fill(false);
  const labels = weekLabels(useKstDay());
  const next = streak?.nextBadge ?? null;
  const earned = streak?.badges ?? [];
  const pick = (days: number) => setAvatar({ ...avatar, badge: avatar.badge === days ? 0 : days }, true);

  return (
    <section id="streak" className="scroll-mt-4">
      <h2 className="mb-2 font-pixel text-[15px] text-paper-subtle">연속 기록</h2>
      <Panel>
        <div className="divide-y-2 divide-ink/10 px-4">
          <div className="flex items-center gap-3 py-4">
            <Flame lit={Boolean(streak?.today)} size={36} />
            <div className="min-w-0 flex-1">
              <p className="font-pixel-title text-[24px] leading-none">{current}일 연속</p>
              <p className="mt-1.5 text-[13px] text-ink-subtle">최고 {streak?.best ?? 0}일</p>
            </div>
          </div>

          {/* 카페 도장 쿠폰처럼 한 날에 도장 하나. 도장마다 조금씩 다르게 기울여 손으로 찍은 것처럼 보이게 한다 */}
          <ol className="grid grid-cols-7 gap-1 border-t-2 border-dashed border-ink/25 py-3" aria-label="최근 7일 도장">
            {week.map((done, i) => {
              const today = i === 6;
              return (
                <li key={i} className="flex flex-col items-center gap-1.5" aria-label={`${labels[i]}요일${today ? " 오늘" : ""}, ${done ? "도장 찍음" : "안 함"}`}>
                  <span className={`text-[12px] leading-none ${today ? "font-semibold text-ink" : "text-ink-subtle"}`}>{labels[i]}</span>
                  <StampSlot done={done} today={today} tilt={STAMP_TILTS[i]} />
                </li>
              );
            })}
          </ol>

          {next && (
            <div className="flex items-center gap-3 py-3">
              <Medal days={next} size={32} locked />
              <div className="min-w-0 flex-1">
                <p className="text-[14px]">
                  {next}일 뱃지까지 <span className="font-semibold">{next - current}일</span>
                </p>
                <Progress value={current} max={next} />
              </div>
            </div>
          )}

          {earned.length > 0 && (
            <div className="py-3">
              <p id="badge-label" className="text-[13px] text-ink-subtle">
                모은 뱃지
              </p>
              <div role={member ? "radiogroup" : "list"} aria-labelledby="badge-label" className="mt-2 flex flex-wrap gap-2">
                {earned.map((days) => {
                  const on = member && avatar.badge === days;
                  const body = (
                    <>
                      <Medal days={days} size={32} />
                      <span className="font-pixel text-[15px] leading-none">{days}일</span>
                    </>
                  );
                  const tile = `relative flex size-14 flex-col items-center justify-center gap-1 ${on ? "bg-gold outline outline-2 outline-ink" : "bg-ink/5"}`;
                  return member ? (
                    <button key={days} type="button" role="radio" aria-checked={on} aria-label={`${badgeLabel(days)}, 이름 옆에 달기`} onClick={() => pick(days)} className={tile}>
                      {body}
                    </button>
                  ) : (
                    <span key={days} role="listitem" aria-label={badgeLabel(days)} className={tile}>
                      {body}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Panel>
    </section>
  );
}

// 도장 칸의 둥근 테두리(12×12 도트)
const RING = ["....xxxx....", "..xx....xx..", ".x........x.", ".x........x.", "x..........x", "x..........x", "x..........x", "x..........x", ".x........x.", ".x........x.", "..xx....xx..", "....xxxx...."];
const STAMP_TILTS = [-8, 5, -3, 9, -6, 3, -10];

function Ring({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden className="absolute inset-0">
      {RING.flatMap((row, y) => row.split("").map((c, x) => (c === "x" ? <rect key={`${y}-${x}`} x={x} y={y} width={1} height={1} fill={color} /> : null)))}
    </svg>
  );
}

// 하루 한 칸. 한 날에는 빨간 "참" 도장이 찍히고, 오늘 아직 안 했으면 점선 칸으로 남는다
function StampSlot({ done, today, tilt }: { done: boolean; today: boolean; tilt: number }) {
  return (
    <span className="relative grid size-9 place-items-center" style={done ? { rotate: `${tilt}deg` } : undefined}>
      <Ring color={done ? "#c42b2b" : today ? "rgb(20 19 23 / 0.45)" : "rgb(20 19 23 / 0.15)"} size={36} />
      {done && <span className="relative font-pixel-title text-[12px] leading-none text-[#c42b2b]">참</span>}
    </span>
  );
}

// 다음 뱃지까지의 진행. 열 칸 이하면 하루가 한 칸이라 남은 날을 셀 수 있고, 길면 막대로 보여준다
function Progress({ value, max }: { value: number; max: number }) {
  const filled = Math.min(value, max);
  if (max <= 10) {
    return (
      <div className="mt-1.5 flex gap-1" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`h-2 flex-1 ${i < filled ? "bg-[#f08a24]" : "bg-ink/10"}`} />
        ))}
      </div>
    );
  }
  return (
    <div className="mt-1.5 h-2 bg-ink/10" aria-hidden>
      <div className="h-full bg-[#f08a24]" style={{ width: `${(filled / max) * 100}%` }} />
    </div>
  );
}
