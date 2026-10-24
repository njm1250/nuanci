"use client";

import { setAvatar, useAvatar } from "@/features/avatar/avatar";
import { earnedRewards, nextReward, REWARDS, ruleHint, type Reward } from "@/features/rewards/rewards";
import { Panel } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { Stage } from "@/features/stage/stage";
import type { Hero } from "@/features/stage/types";
import { useAccount } from "./account";
import { GoogleButton } from "./google-button";

const HERO_LABELS: Record<Hero, string> = { boy: "남자", girl: "여자" };

// 아지트: 장면 속 주인공을 꾸미고, 얻은 물건을 방에 두는 곳. 아직 못 얻은 아이템은 무엇인지 감춰서 얻는 재미를 남긴다.
// 쓰고 두는 건 로그인한 뒤에만 된다
export function RoomView() {
  const cleared = useCleared();
  const account = useAccount();
  const avatar = useAvatar();
  const member = account.status === "member";
  const earned = earnedRewards(cleared);
  const owns = (r: Reward) => earned.some((e) => e.id === r.id);
  const next = nextReward(cleared);
  const placed = member ? earned.filter((r) => r.kind === "room" && !avatar.hidden.includes(r.id)).map((r) => r.id) : [];
  const isOn = (r: Reward) => (r.kind === "wear" ? avatar.accessory === r.accessory : placed.includes(r.id));

  // 쓴 아이템은 다시 누르면 벗고, 놓인 물건은 다시 누르면 치운다
  const toggle = (r: Reward) => {
    if (r.kind === "wear") return setAvatar({ ...avatar, accessory: isOn(r) ? null : r.accessory }, true);
    const hidden = isOn(r) ? [...avatar.hidden, r.id] : avatar.hidden.filter((id) => id !== r.id);
    setAvatar({ ...avatar, hidden }, true);
  };

  // 켜고 끄는 상태는 색과 체크로만 보여주고, 아직 못 쓰는 아이템에만 짧은 조건을 붙인다
  const hint = (r: Reward) => (owns(r) ? (member ? null : "로그인 필요") : ruleHint(r.rule, cleared));

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_400px] md:items-start md:gap-10">
      <div className="md:sticky md:top-6">
      <Panel>
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Stage
            spec={{ set: "room", time: "day", partner: "mochi", hero: avatar.hero, accessory: avatar.accessory ?? undefined, flags: [`books-${cleared.length}`, ...placed] }}
            state={{ partnerMotion: "idle", partnerKey: 0, talkKey: 0, reaction: null, meLine: "여기가 내 아지트야!" }}
          />
        </div>
      </Panel>
      <p className="mt-3 text-[13px] text-paper-muted">꾸민 모습은 장면에도 그대로 나와요.</p>
      {next && (
        <p className="mt-2 inline-block bg-gold px-2 py-1 font-pixel text-[15px] leading-none text-ink">
          장면 {next.remaining}개 더 해 보면 {next.reward.name}
        </p>
      )}

      </div>

      <div>
      <h2 className="mt-6 font-pixel text-[15px] text-paper md:mt-0">주인공</h2>
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

      <h2 className="mt-6 font-pixel text-[15px] text-paper">꾸미기</h2>
      <ul className="mt-2 grid grid-cols-2 gap-3">
        {REWARDS.map((r) => {
          const usable = owns(r) && member;
          const active = usable && isOn(r);
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => toggle(r)}
                disabled={!usable}
                aria-pressed={usable ? active : undefined}
                className={`blk flex min-h-14 w-full items-center justify-between gap-2 px-3 py-2 text-left ${active ? "bg-gold text-ink" : usable ? "bg-cream text-ink" : "bg-slate-block text-paper"}`}
              >
                <span className="min-w-0">
                  <span className="block font-pixel text-[15px]">{owns(r) ? r.name : "???"}</span>
                  {hint(r) && <span className="block text-[12px] text-paper-subtle">{hint(r)}</span>}
                </span>
                {active && (
                  <svg width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-ink">
                    <path d="M6 1h1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h1v1h1v1h1v-1h1v-1h1z" />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {!member && account.status !== "loading" && (
        <Panel className="mt-6">
          <div className="p-4">
            <p className="font-pixel text-[15px]">로그인하고 꾸미기</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">얻은 아이템을 쓰고 방에 둘 수 있어요. 꾸민 모습은 다른 기기에서도 그대로예요.</p>
            <GoogleButton next="/me/room" enabled={account.google} />
          </div>
        </Panel>
      )}
      </div>
    </div>
  );
}
