"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/features/account/account";
import { setAvatar, useAvatar } from "@/features/avatar/avatar";
import { sfx } from "@/features/scene/sfx";
import { place, putOn, takeOff, useHeroLook } from "./hero-look";
import { RewardIcon } from "./reward-icon";
import { COLOR_HEX, COLOR_LABELS, isUnopened, markRewardsSeen, ownedReason, setRewardColor, useRewards, type RewardItem } from "./rewards";

// 완료 화면의 팡파르(0.75초부터 1.6초쯤까지)가 끝난 뒤에 카드가 들어온다. 축하 소리가 겹치지 않고 하나씩 들리게 한다.
// 아이콘은 카드가 자리 잡은 뒤 튀어나온다
const ENTER_DELAY = 1600;
const POP_AFTER = 180;

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

// 완료 화면에 뜨는 새 물건 카드들. 처음에는 쓰지도 두지도 않은 상태로 보여주고, 쓰기·방에 두기를 누르면 무대에 바로 보인다.
// 깜짝 상자는 직접 열어야 보이고, 열지 않고 넘어가도 아지트에 닫힌 채로 남는다
export function RewardReveal({
  items,
  sceneTitle,
  reduced,
  onShown,
  after = 0,
}: {
  items: RewardItem[];
  sceneTitle: string;
  reduced: boolean;
  onShown: (ids: string[]) => void;
  after?: number;
}) {
  const rewards = useRewards();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || items.length === 0 || !rewards) return;
    shown.current = true;
    onShown(items.map((i) => i.id));
    const ready = items.filter((i) => !isUnopened(i));
    markRewardsSeen(ready.map((i) => i.id));
    // 팡파르가 끝날 즈음 카드가 들어오고, 아이콘이 튀어나오는 순간에 반짝 소리를 맞춘다
    if (ready.length > 0) sfx.reward((ENTER_DELAY + after + POP_AFTER) / 1000);
  }, [items, rewards, onShown, after]);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <RewardCard key={item.id} item={item} sceneTitle={sceneTitle} reduced={reduced} delay={ENTER_DELAY + after} compact />
      ))}
    </div>
  );
}

// 새 물건 카드 하나. 열지 않은 상자면 상자부터 보여주고, 열면 안에 든 물건을 바로 쓰거나 둔다
// stacked면 상자가 여러 개 쌓인 모양으로 그린다. onClose가 있으면 연 뒤 카드를 닫을 수 있다
export function RewardCard({
  item,
  sceneTitle,
  reduced,
  delay: enterDelay = 0,
  stacked = false,
  onOpened,
  onClose,
  compact = false,
}: {
  item: RewardItem;
  sceneTitle?: string;
  reduced: boolean;
  delay?: number;
  stacked?: boolean;
  onOpened?: (id: string) => void;
  onClose?: () => void;
  compact?: boolean;
}) {
  // 상자를 연 순간에는 기다리지 않고 바로 튀어나온다
  const [opened, setOpened] = useState(false);
  const delay = opened ? 0 : enterDelay;
  const avatar = useAvatar();
  const rewards = useRewards();
  const account = useAccount();
  const member = account.status === "member";
  const [shaking, setShaking] = useState(false);
  const owned = item.owned!;
  const all = rewards?.items ?? [];
  const look = useHeroLook();
  const on = item.kind === "wear" ? look.isWorn(item.id) : look.placed.includes(item.id);

  const open = () => {
    const reveal = () => {
      sfx.boxOpen();
      sfx.reward(0.05);
      setShaking(false);
      setOpened(true);
      onOpened?.(item.id);
      markRewardsSeen([item.id]);
    };
    if (reduced) return reveal();
    setShaking(true);
    window.setTimeout(reveal, 520);
  };

  const toggle = () => {
    if (item.kind === "wear") return setAvatar(on ? takeOff(avatar, item) : putOn(avatar, item, all), member);
    setAvatar(place(avatar, look.placed, item.id, !on), member);
  };

  const pickColor = (color: (typeof item.colors)[number]) => setRewardColor(item.id, color);

  const enter = reduced ? undefined : { animation: `rise 260ms ease-out ${delay}ms both` };
  // 완료 화면에서는 그 장면의 발견이 중심이라 차분한 색과 작은 크기로 덧붙인다. 아지트에서는 크게 보여준다
  const tone = compact
    ? { card: "bg-slate-block text-paper", muted: "text-paper-subtle", ring: "border-paper", box: "size-12", icon: 34, name: "text-[16px]" }
    : { card: "bg-gold text-ink", muted: "text-ink-muted", ring: "border-ink", box: "size-16", icon: 44, name: "text-[20px]" };

  if (isUnopened(item)) {
    return (
      <div className="blk-frame" style={enter}>
        <div className={`blk flex items-center gap-3 px-3 py-3 ${tone.card}`}>
          <div className={`relative shrink-0 ${tone.box}`}>
            {/* 남은 상자가 더 있으면 뒤에 한 장 더 겹쳐 그려서 쌓여 있는 것을 보여준다 */}
            {stacked && <span aria-hidden className={`absolute -right-1.5 -top-1.5 bg-cream/60 ${tone.box}`} />}
            <div className={`relative grid place-items-center bg-cream ${tone.box} ${shaking ? "animate-[box-shake_520ms_ease-in-out]" : ""}`}>
              <RewardIcon id="box" size={tone.icon} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[15px]">깜짝 상자</p>
            <p className={`mt-0.5 text-[13px] ${tone.muted}`}>아지트에 둘 물건 하나</p>
          </div>
          <button type="button" onClick={open} disabled={shaking} className="blk min-h-11 shrink-0 bg-ink px-4 font-pixel text-[15px] text-gold">
            열기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="blk-frame" style={enter}>
      <div className={`blk relative overflow-hidden px-3 py-3 ${tone.card}`}>
        <div className="relative flex items-center gap-3">
          <div className={`relative grid shrink-0 place-items-center ${tone.box}`}>
            {!reduced && !compact && (
              <span
                aria-hidden
                className="absolute -inset-5 [background:repeating-conic-gradient(#fff9_0deg_12deg,transparent_12deg_30deg)] [mask-image:radial-gradient(closest-side,#000_40%,transparent)]"
                style={{ animation: `rays 1400ms ease-out ${delay + POP_AFTER}ms both` }}
              />
            )}
            <div className={`relative grid place-items-center bg-cream ${tone.box}`}>
              <span style={reduced ? undefined : { animation: `reward-pop 560ms ease-out ${delay + POP_AFTER}ms both` }}>
                <RewardIcon id={item.id} color={owned.color} size={tone.icon} />
              </span>
            </div>
            {!reduced &&
              !compact &&
              SPARKS.map(([dx, dy], i) => (
                <span
                  key={i}
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 bg-cream"
                  style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, animation: `sparkle 700ms ease-out ${delay + POP_AFTER + 220 + i * 35}ms both` } as React.CSSProperties}
                />
              ))}
          </div>
          <div className="min-w-0 flex-1 self-start">
            <p className={`font-pixel text-[13px] ${tone.muted}`}>새 물건</p>
            <p className={`truncate font-pixel-title leading-[1.25] ${tone.name}`}>{item.name}</p>
            <p className={`truncate text-[12px] ${tone.muted}`}>{ownedReason(owned, sceneTitle)}</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="닫기" className="-mr-1 -mt-1 grid size-11 shrink-0 place-items-center self-start text-ink">
              <svg width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden className="fill-current">
                <path d="M0 0h2v1h1v1h1V1h1V0h2v2H6v1H5v1h1v1h1v2H5V6H4V5H3v1H2v1H0V5h1V4h1V3H1V2H0z" />
              </svg>
            </button>
          )}
        </div>

        <div className="relative mt-3 flex flex-wrap items-center gap-2">
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
            <div role="radiogroup" aria-label="색" className="flex">
              {item.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={owned.color === c}
                  aria-label={COLOR_LABELS[c]}
                  onClick={() => pickColor(c)}
                  className={`grid size-11 place-items-center border-[3px] ${owned.color === c ? tone.ring : "border-transparent"}`}
                >
                  <span className="grid size-6 place-items-center text-paper" style={{ background: COLOR_HEX[c] }}>
                    {owned.color === c && <Check />}
                  </span>
                </button>
              ))}
            </div>
          )}
          {item.kind === "room" && sceneTitle !== undefined && (
            <Link href="/me/room?tab=room" className={`ml-auto flex min-h-11 items-center px-1 font-pixel text-[15px] underline underline-offset-4 ${tone.muted}`}>
              아지트
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
