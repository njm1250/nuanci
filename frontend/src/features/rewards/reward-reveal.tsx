"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/features/account/account";
import { currentAvatar, setAvatar, useAvatar } from "@/features/avatar/avatar";
import { sfx } from "@/features/scene/sfx";
import { putOn, takeOff } from "./hero-look";
import { RewardIcon } from "./reward-icon";
import { COLOR_HEX, COLOR_LABELS, isUnopened, markRewardsSeen, ownedReason, setRewardColor, useRewards, type RewardItem } from "./rewards";

const SPARKS = [
  [-44, -30],
  [40, -36],
  [-52, 8],
  [50, 12],
  [-24, 38],
  [28, 40],
  [0, -48],
];

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-current">
      <path d="M6 1h1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h1v1h1v1h1v-1h1v-1h1z" />
    </svg>
  );
}

// 완료 화면에 뜨는 새 물건 카드들. 얻자마자 쓰고(방 물건은 바로 놓이고) 색을 고르면 무대 위 주인공에 바로 보인다.
// 깜짝 상자는 직접 열어야 보이고, 열지 않고 넘어가도 아지트에 닫힌 채로 남는다
export function RewardReveal({ items, sceneTitle, reduced, onShown }: { items: RewardItem[]; sceneTitle: string; reduced: boolean; onShown: (ids: string[]) => void }) {
  const account = useAccount();
  const rewards = useRewards();
  const member = account.status === "member";
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || items.length === 0 || !rewards) return;
    shown.current = true;
    onShown(items.map((i) => i.id));
    const ready = items.filter((i) => !isUnopened(i));
    markRewardsSeen(ready.map((i) => i.id));
    // 쓰는 아이템은 얻는 즉시 쓴다. 같은 자리에 쓰던 것은 벗는다
    let next = currentAvatar();
    for (const item of ready) {
      if (item.kind === "wear") next = putOn(next, item, rewards.items);
      else next = { ...next, hidden: next.hidden.filter((id) => id !== item.id) };
    }
    setAvatar(next, member);
    if (ready.length > 0) sfx.reward(1.5);
  }, [items, rewards, member, onShown]);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <RewardCard key={item.id} item={item} sceneTitle={sceneTitle} reduced={reduced} />
      ))}
    </div>
  );
}

// 새 물건 카드 하나. 열지 않은 상자면 상자부터 보여주고, 열면 안에 든 물건을 바로 쓰거나 둔다
export function RewardCard({ item, sceneTitle, reduced }: { item: RewardItem; sceneTitle?: string; reduced: boolean }) {
  const avatar = useAvatar();
  const rewards = useRewards();
  const account = useAccount();
  const member = account.status === "member";
  const [shaking, setShaking] = useState(false);
  const owned = item.owned!;
  const all = rewards?.items ?? [];
  const on = item.kind === "wear" ? (avatar.wear as string[]).includes(item.id) : !avatar.hidden.includes(item.id);

  const open = () => {
    const reveal = () => {
      sfx.boxOpen();
      sfx.reward(0.05);
      setShaking(false);
      markRewardsSeen([item.id]);
      setAvatar({ ...currentAvatar(), hidden: currentAvatar().hidden.filter((id) => id !== item.id) }, member);
    };
    if (reduced) return reveal();
    setShaking(true);
    window.setTimeout(reveal, 520);
  };

  const toggle = () => {
    if (item.kind === "wear") return setAvatar(on ? takeOff(avatar, item) : putOn(avatar, item, all), member);
    setAvatar({ ...avatar, hidden: on ? [...avatar.hidden, item.id] : avatar.hidden.filter((id) => id !== item.id) }, member);
  };

  // 색을 고르면 그 아이템을 쓰고 있지 않았어도 바로 쓴다
  const pickColor = (color: (typeof item.colors)[number]) => {
    setRewardColor(item.id, color);
    if (!on) setAvatar(putOn(avatar, item, all), member);
  };

  if (isUnopened(item)) {
    return (
      <div className="blk-frame animate-[rise_240ms_ease-out]">
        <div className="blk flex items-center gap-4 bg-gold px-4 py-4 text-ink">
          <div className={`grid size-20 shrink-0 place-items-center bg-cream ${shaking ? "animate-[box-shake_520ms_ease-in-out]" : ""}`}>
            <RewardIcon id="box" size={56} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[15px]">깜짝 상자</p>
            <p className="mt-0.5 text-[13px] text-ink-muted">아지트에 둘 물건 하나</p>
          </div>
          <button type="button" onClick={open} disabled={shaking} className="blk min-h-11 shrink-0 bg-ink px-4 font-pixel text-[15px] text-gold">
            열기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="blk-frame animate-[rise_240ms_ease-out]">
      <div className="blk relative overflow-hidden bg-gold px-4 py-4 text-ink">
        <div className="relative flex items-center gap-4">
          <div className="relative grid size-20 shrink-0 place-items-center">
            {!reduced && (
              <span
                aria-hidden
                className="absolute -inset-6 animate-[rays_9s_linear_infinite] opacity-40 [background:repeating-conic-gradient(#fff8_0deg_12deg,transparent_12deg_30deg)] [mask-image:radial-gradient(closest-side,#000_40%,transparent)]"
              />
            )}
            <div className="relative grid size-20 place-items-center bg-cream">
              <span className={reduced ? "" : "animate-[reward-pop_620ms_ease-out_300ms_both]"}>
                <RewardIcon id={item.id} color={owned.color} size={56} />
              </span>
            </div>
            {!reduced &&
              SPARKS.map(([dx, dy], i) => (
                <span
                  key={i}
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 size-2 animate-[sparkle_800ms_ease-out_both] bg-paper"
                  style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, animationDelay: `${450 + i * 40}ms` } as React.CSSProperties}
                />
              ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[15px] text-ink-muted">새 물건</p>
            <p className="font-pixel-title text-[24px] leading-[1.2]">{item.name}</p>
            <p className="mt-0.5 text-[13px] text-ink-muted">{ownedReason(owned, sceneTitle)}</p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-pressed={on}
            className={`blk flex min-h-11 items-center gap-2 px-3 font-pixel text-[15px] ${on ? "bg-ink text-gold" : "bg-cream text-ink"}`}
          >
            {item.kind === "wear" ? "쓰기" : "방에 두기"}
            {on && <Check />}
          </button>
          {item.colors.length > 0 && (
            <div role="radiogroup" aria-label="색" className="flex gap-2">
              {item.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={owned.color === c}
                  aria-label={COLOR_LABELS[c]}
                  onClick={() => pickColor(c)}
                  className={`grid size-11 place-items-center border-[3px] ${owned.color === c ? "border-ink" : "border-transparent"}`}
                >
                  <span className="grid size-7 place-items-center text-paper" style={{ background: COLOR_HEX[c] }}>
                    {owned.color === c && <Check />}
                  </span>
                </button>
              ))}
            </div>
          )}
          {item.kind === "room" && sceneTitle !== undefined && (
            <Link href="/me/room?tab=room" className="ml-auto flex min-h-11 items-center px-1 font-pixel text-[15px] text-ink-muted underline underline-offset-4">
              아지트
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
