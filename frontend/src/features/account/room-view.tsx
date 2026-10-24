"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { setAvatar } from "@/features/avatar/avatar";
import { putOn, takeOff, useHeroLook } from "@/features/rewards/hero-look";
import { RewardCard } from "@/features/rewards/reward-reveal";
import { RewardIcon } from "@/features/rewards/reward-icon";
import {
  COLOR_HEX,
  COLOR_LABELS,
  isUnopened,
  isUsable,
  lockHint,
  markAllRewardsSeen,
  nextGoalParts,
  openedHere,
  ownedReason,
  setRewardColor,
  useRewards,
  type RewardItem,
} from "@/features/rewards/rewards";
import { Panel } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { Stage } from "@/features/stage/stage";
import type { Hero } from "@/features/stage/types";
import { useReducedMotion } from "@/features/scene/use-scene-flow";
import { useAccount } from "./account";
import { GoogleButton } from "./google-button";

const noop = () => () => {};
const HERO_LABELS: Record<Hero, string> = { boy: "남자", girl: "여자" };

const TABS = [
  { id: "wear", label: "옷장" },
  { id: "room", label: "방 꾸미기" },
  { id: "log", label: "수집 기록" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-current">
      <path d="M6 1h1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h1v1h1v1h1v-1h1v-1h1z" />
    </svg>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 아지트: 옷장에서 주인공을 꾸미고, 얻은 물건을 방에 두고, 무엇을 언제 얻었는지 돌아보는 곳.
// 아직 못 얻은 아이템은 무엇인지 감추고 조건만 짧게 보여준다
export function RoomView({ titles }: { titles: Record<string, string> }) {
  const cleared = useCleared();
  const account = useAccount();
  const rewards = useRewards();
  const look = useHeroLook();
  const { avatar } = look;
  const member = account.status === "member";
  // 완료 화면에서 방 물건을 보러 오면 방 꾸미기 탭부터 연다
  const linked = useSyncExternalStore(noop, () => new URLSearchParams(location.search).get("tab"), () => null);
  const [picked, setTab] = useState<Tab | null>(null);
  const tab: Tab = picked ?? (linked === "room" || linked === "log" ? linked : "wear");

  // 새 표시는 이 화면에 있는 동안 남기고, 떠날 때 본 것으로 남긴다
  useEffect(() => () => markAllRewardsSeen(), []);

  const items = rewards?.items ?? [];
  const reduced = useReducedMotion();
  const isOn = (r: RewardItem) => (r.kind === "wear" ? look.isWorn(r.id) : look.placed.includes(r.id));

  // 쓴 아이템은 다시 누르면 벗고, 놓인 물건은 다시 누르면 치운다. 같은 자리에 쓰던 아이템은 바꿔 쓴다
  const toggle = (r: RewardItem) => {
    if (r.kind === "wear") return setAvatar(isOn(r) ? takeOff(avatar, r) : putOn(avatar, r, items), member);
    const hidden = isOn(r) ? [...avatar.hidden, r.id] : avatar.hidden.filter((id) => id !== r.id);
    setAvatar({ ...avatar, hidden }, member);
  };

  const worn = items.filter((i) => i.kind === "wear" && isUsable(i) && look.isWorn(i.id) && i.colors.length > 0);
  const log = items.filter(isUsable).sort((a, b) => b.owned!.grantedAt.localeCompare(a.owned!.grantedAt));
  // 장면 완료 화면에서 열지 않고 넘어간 상자는 여기서 연다
  const boxes = items.filter((i) => isUnopened(i) || openedHere(i));

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_400px] md:items-start md:gap-10">
      <div className="md:sticky md:top-6">
        <Panel>
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <Stage
              spec={{
                set: "room",
                time: "day",
                partner: "mochi",
                hero: look.hero,
                wear: look.wear,
                flags: [`books-${cleared.length}`, ...look.placed],
              }}
              state={{ partnerMotion: "idle", partnerKey: 0, talkKey: 0, reaction: null, meLine: "여기가 내 아지트야!" }}
            />
          </div>
        </Panel>
        {rewards?.next && (
          <p className="mt-3 inline-block bg-gold px-2 py-1 font-pixel text-[15px] leading-none text-ink">
            {nextGoalParts(rewards.next)[0]}
            <span className="mx-0.5 bg-ink px-1 text-gold">{nextGoalParts(rewards.next)[1]}</span>
            {nextGoalParts(rewards.next)[2]}
          </p>
        )}
      </div>

      <div className="mt-6 md:mt-0">
        {boxes.length > 0 && (
          <div className="mb-6 space-y-4">
            {boxes.map((b) => (
              <RewardCard key={b.id} item={b} reduced={reduced} />
            ))}
          </div>
        )}
        <div role="tablist" aria-label="아지트" className="grid grid-cols-3 gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`blk min-h-11 font-pixel text-[15px] ${tab === t.id ? "bg-cream text-ink" : "bg-slate-block text-paper-muted"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-5">
          {tab === "wear" && (
            <>
              <h2 className="font-pixel text-[15px] text-paper">주인공</h2>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(["boy", "girl"] as const).map((hero) => (
                  <button
                    key={hero}
                    type="button"
                    onClick={() => setAvatar({ ...avatar, hero }, member)}
                    aria-pressed={avatar.hero === hero}
                    className={`blk min-h-12 font-pixel text-[15px] ${avatar.hero === hero ? "bg-cream text-ink" : "bg-slate-block text-paper-muted"}`}
                  >
                    {HERO_LABELS[hero]}
                  </button>
                ))}
              </div>
              <h2 className="mt-6 font-pixel text-[15px] text-paper">쓰는 아이템</h2>
              <ItemGrid items={items.filter((i) => i.kind === "wear")} isOn={isOn} toggle={toggle}  />
              {worn.map((w) => (
                <div key={w.id} className="mt-4 flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate font-pixel text-[15px] text-paper-muted">{w.name} 색</span>
                  <div role="radiogroup" aria-label={`${w.name} 색`} className="flex gap-2">
                    {w.colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={w.owned!.color === c}
                        aria-label={COLOR_LABELS[c]}
                        onClick={() => setRewardColor(w.id, c)}
                        className={`grid size-11 place-items-center border-[3px] ${w.owned!.color === c ? "border-paper" : "border-transparent"}`}
                      >
                        <span className="grid size-7 place-items-center text-paper" style={{ background: COLOR_HEX[c] }}>
                          {w.owned!.color === c && <Check />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "room" && <ItemGrid items={items.filter((i) => i.kind === "room")} isOn={isOn} toggle={toggle}  />}

          {tab === "log" &&
            (log.length === 0 ? (
              <p className="text-[14px] leading-relaxed text-paper-muted">장면을 끝내면 얻은 물건이 여기에 하나씩 쌓여요.</p>
            ) : (
              <ul className="space-y-2">
                {log.map((r) => (
                  <li key={r.id} className="blk flex items-center gap-3 bg-slate-block px-3 py-2 text-paper">
                    <span className="grid size-12 shrink-0 place-items-center bg-night-deep">
                      <RewardIcon id={r.id} color={r.owned!.color} size={36} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-pixel text-[15px]">{r.name}</span>
                      <span className="block text-[13px] text-paper-subtle">{ownedReason(r.owned!, r.owned!.sceneId ? titles[r.owned!.sceneId] : undefined)}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-paper-subtle">{formatDate(r.owned!.grantedAt)}</span>
                  </li>
                ))}
              </ul>
            ))}
        </div>

        {!member && account.status !== "loading" && (
          <Panel className="mt-6">
            <div className="p-4">
              <p className="font-pixel text-[15px]">로그인하고 계정에 남기기</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">꾸민 모습과 모은 물건이 다른 기기에서도 그대로예요.</p>
              <GoogleButton next="/me/room" enabled={account.google} />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

// 켜고 끄는 상태는 색과 체크로만 보여주고, 아직 못 얻은 아이템에만 짧은 조건을 붙인다
function ItemGrid({ items, isOn, toggle }: { items: RewardItem[]; isOn: (r: RewardItem) => boolean; toggle: (r: RewardItem) => void }) {
  return (
    <ul className="mt-2 grid grid-cols-2 gap-3">
      {[...items.filter(isUsable), ...items.filter((i) => !isUsable(i))].map((r) => {
        const owned = isUsable(r);
        const active = owned && isOn(r);
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => toggle(r)}
              disabled={!owned}
              aria-pressed={owned ? active : undefined}
              className={`blk flex min-h-16 w-full items-center gap-2 px-2 py-2 text-left ${active ? "bg-gold text-ink" : owned ? "bg-cream text-ink" : "bg-slate-block text-paper"}`}
            >
              <span className={`grid size-11 shrink-0 place-items-center ${owned ? "bg-paper/60" : "bg-night-deep"}`}>
                <RewardIcon id={owned ? r.id : "locked"} color={r.owned?.color} size={32} className={owned ? "" : "opacity-40 [filter:invert(1)]"} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-pixel text-[15px]">
                  {owned ? r.name : "???"}
                  {owned && !r.owned!.seen && <span className="bg-rust px-1 font-pixel-title text-[11px] leading-[1.4] text-paper">NEW</span>}
                </span>
                {!owned && <span className="block text-[12px] text-paper-subtle">{r.lock ? lockHint(r.lock) : "깜짝 상자"}</span>}
              </span>
              {active && <Check />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
