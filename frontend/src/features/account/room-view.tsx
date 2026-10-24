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

  const status = (r: Reward) => {
    if (owns(r) && member) {
      if (r.kind === "wear") return isOn(r) ? "쓰는 중 · 눌러서 벗기" : "눌러서 쓰기";
      return isOn(r) ? "놓여 있어요 · 눌러서 치우기" : "치워 뒀어요 · 눌러서 놓기";
    }
    if (owns(r)) return "로그인하면 쓸 수 있어요";
    return `${ruleHint(r.rule, cleared)} 얻어요`;
  };

  return (
    <>
      <Panel>
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Stage
            spec={{ set: "room", time: "day", partner: "mochi", hero: avatar.hero, accessory: avatar.accessory ?? undefined, flags: [`books-${cleared.length}`, ...placed] }}
            state={{ partnerMotion: "idle", partnerKey: 0, talkKey: 0, reaction: null, meLine: "여기가 내 아지트야!" }}
          />
        </div>
      </Panel>
      <p className="mt-3 text-[13px] leading-relaxed text-paper-muted">
        장면 속 &lsquo;나&rsquo;예요. 꾸민 모습은 장면에도 그대로 나와요. 책장에는 해 본 장면 수만큼 책이 꽂혀요.
      </p>
      {next && (
        <p className="mt-2 inline-block bg-gold px-2 py-1 font-pixel text-[15px] leading-none text-ink">
          장면 {next.remaining}개 더 해 보면 {next.reward.name}
        </p>
      )}

      <h2 className="mt-6 font-pixel text-[15px] text-paper">주인공</h2>
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
                className={`blk block w-full px-3 py-3 text-left ${active ? "bg-gold text-ink" : usable ? "bg-cream text-ink" : "bg-slate-block text-paper"}`}
              >
                <span className="block font-pixel text-[15px]">{owns(r) ? r.name : "???"}</span>
                <span className={`mt-0.5 block text-[12px] ${active || usable ? "text-ink-subtle" : "text-paper-subtle"}`}>{status(r)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {!member && account.status !== "loading" && (
        <Panel className="mt-6">
          <div className="p-4">
            <p className="font-pixel text-[15px]">{earned.length > 0 ? "얻은 아이템을 쓰려면" : "꾸민 모습을 남기려면"}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">로그인하면 얻은 아이템을 쓰고 방에 둘 수 있어요. 꾸민 모습은 계정에 저장돼서 다른 기기에서도 그대로예요.</p>
            <GoogleButton next="/me/room" enabled={account.google} />
          </div>
        </Panel>
      )}
    </>
  );
}
