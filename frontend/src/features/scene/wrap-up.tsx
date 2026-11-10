"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { bookEntry, spoken } from "@/features/collection/pairs";
import { useInquiry } from "@/features/inquiry/inquiry-form";
import { Mascot } from "@/features/mascot/mascot";
import { RewardIcon } from "@/features/rewards/reward-icon";
import { RewardReveal } from "@/features/rewards/reward-reveal";
import { isUnopened, type RewardItem } from "@/features/rewards/rewards";
import { type StreakMoment } from "@/features/streak/streak";
import { StreakMomentCard } from "@/features/streak/streak-ui";
import { BlockButton } from "./block-ui";
import { sfx } from "./sfx";
import { type Scene } from "./types";
import { Arrow } from "./scene-parts";

// 고른 말을 들은 상대가 무대에서 반응을 말하기까지의 시간. 생각 말풍선은 650ms에 떠서 3050ms에 사라진다
export const REACT_AFTER = 1100;
export const REACT_AFTER_IMAGINE = 3100;

// 완료 화면의 팡파르(0.75초부터 1.6초쯤까지)가 끝난 뒤 연속 기록 줄이 들어오고, 새 물건 카드는 그다음에 들어온다.
// 축하 소리가 겹치지 않게 하나씩 차례로 울린다
export const STREAK_DELAY = 1600;
export const AFTER_STREAK = 750;
// 새 물건 카드가 들어오는 순간 주인공도 무대에서 그 물건을 받고, 이만큼 보여준 뒤 원래 엔딩으로 돌아간다
export const PRIZE_MS = 4000;

// 완료 화면에서 무대에 올릴 새 물건. 쓰는 아이템을 먼저 골라 주인공이 직접 써 보게 한다
export function stagePrize(granted: RewardItem[]) {
  return granted.find((i) => i.kind === "wear" && !isUnopened(i)) ?? granted[0] ?? null;
}

// 무대 위 주인공 말풍선에 띄우는 새 물건. 상자는 열기 전이라 무엇인지 감춘다
export function PrizeNote({ item }: { item: RewardItem }) {
  const box = isUnopened(item);
  return (
    <span className="flex items-center gap-1.5">
      <RewardIcon id={box ? "box" : item.id} color={item.owned?.color} size={24} />
      <span>{box ? "깜짝 상자다!" : `${item.name} 득템!`}</span>
    </span>
  );
}

// 장면을 끝낸 뒤의 완료 화면. 이 장면의 발견(한 줄 정리와 모은 표현)을 가운데 두고, 연속 기록·새 물건은 작게 덧붙인 뒤 친구에게 문제 내기를 권한다
export function WrapUp({
  scene,
  share,
  shareState,
  onBack,
  granted,
  reduced,
  onRewardShown,
  streak,
  rewardAt,
}: {
  scene: Scene;
  share: () => void;
  shareState: "idle" | "copied" | "failed";
  onBack: () => void;
  granted: RewardItem[];
  reduced: boolean;
  onRewardShown: (ids: string[]) => void;
  streak: StreakMoment | null;
  rewardAt: number;
}) {
  const { pairs } = bookEntry(scene);
  const { open: openInquiry, element: inquiry } = useInquiry();
  // 오늘 처음 이어졌으면 연속 기록을 먼저 보여주고, 새 물건은 그 뒤에 들어온다
  const streakShown = useRef(false);
  useEffect(() => {
    if (!streak || streakShown.current) return;
    streakShown.current = true;
    sfx.streak((STREAK_DELAY + 120) / 1000);
  }, [streak]);
  return (
    <div className="animate-rise">
      <div className="flex items-end gap-3">
        <Mascot scale={3} className="shrink-0" />
        <div className="pb-1">
          <p className="font-label text-ui text-fg-muted">장면 완료!</p>
          <p className="mt-1 font-poster text-display-sm leading-[1.25] text-fg">{scene.title}</p>
        </div>
      </div>
      {/* 그 장면에서 발견한 것 하나가 완료 화면의 중심이다. 한 줄 정리와 모은 표현을 한 카드로 묶는다 */}
      <div className="blk-frame mt-5">
        <div className="blk bg-card-raised px-4 py-4 text-ink">
          <p className="text-ui leading-[1.6]">{scene.discovery}</p>
          <ul className="mt-3.5 space-y-3.5 border-t-2 border-dashed border-ink/20 pt-3">
            {pairs.map((p) => (
              <li key={p.right}>
                <p className="font-line text-say leading-snug">{p.right}</p>
                <p className="mt-0.5 text-meta leading-snug text-ink-subtle">
                  {spoken(p.intent)} · <s className="decoration-rust decoration-2">{p.wrong}</s>
                </p>
              </li>
            ))}
          </ul>
          <Link href="/expressions" className="-mx-1 mt-2 flex min-h-11 items-center gap-2 px-1 text-meta text-ink-subtle hover:text-ink">
            표현 모음에 담았어요
            <Arrow />
          </Link>
        </div>
      </div>

      {/* 연속 기록과 새 물건은 발견 뒤에 작게 덧붙인다 */}
      {(streak || granted.length > 0) && (
        <div className="mt-4 space-y-2">
          {streak && <StreakMomentCard current={streak.current} newBadge={streak.newBadge} reduced={reduced} delay={STREAK_DELAY} />}
          {granted.length > 0 && <RewardReveal items={granted} sceneTitle={scene.title} reduced={reduced} onShown={onRewardShown} after={rewardAt - STREAK_DELAY} />}
        </div>
      )}

      <div className="blk mt-5 flex items-center gap-3 bg-surface-strong px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-label text-ui text-fg">친구는 맞힐까?</p>
          <p className="text-note text-fg-subtle">이 장면을 문제로 보내 보세요</p>
        </div>
        <BlockButton onClick={share} className="shrink-0" faceClassName="font-label text-ui text-ink">
          {shareState === "copied" ? "복사됨" : shareState === "failed" ? "복사 실패" : "문제 내기"}
        </BlockButton>
      </div>

      <button type="button" onClick={onBack} className="-mx-1 mt-4 flex min-h-11 items-center gap-2 px-1 font-label text-ui text-fg-muted hover:text-fg">
        <span className="-scale-x-100">
          <Arrow />
        </span>
        다른 말 다시 보기
      </button>
      {/* 판정이나 영어가 이상하면 그 장면에서 바로 알린다. 문의 창이 보던 장면 주소를 함께 보낸다 */}
      <button type="button" onClick={() => openInquiry("scene")} className="-mx-1 flex min-h-11 items-center px-1 text-note text-fg-subtle underline underline-offset-4 hover:text-fg">
        이 장면의 영어가 이상해요
      </button>
      {inquiry}
    </div>
  );
}
