"use client";

import { useState } from "react";
import { setAvatar, useAvatar } from "@/features/avatar/avatar";
import { earnedRewards, nextReward, REWARDS, ruleHint, type Reward } from "@/features/rewards/rewards";
import { Panel } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { Stage } from "@/features/stage/stage";
import type { Hero } from "@/features/stage/types";
import { useAccount } from "./account";
import { GoogleButton } from "./google-button";

const HERO_LABELS: Record<Hero, string> = { boy: "남자", girl: "여자" };

// 아지트: 장면 속 주인공을 꾸미고, 얻은 물건을 방에 두는 곳. 아이템을 누르면 아직 못 얻었어도 어떤 건지 미리 입혀 보고 놓아 본다.
// 쓰고 두는 건 로그인한 뒤에만 되고, 비로그인이면 미리 보기까지만 된다
export function RoomView() {
  const cleared = useCleared();
  const account = useAccount();
  const avatar = useAvatar();
  const member = account.status === "member";
  const earned = earnedRewards(cleared);
  const owns = (r: Reward) => earned.some((e) => e.id === r.id);
  const [preview, setPreview] = useState<Reward | null>(null);
  const next = nextReward(cleared);

  const placed = member ? earned.filter((r) => r.kind === "room").map((r) => r.id) : [];
  const roomPreview = preview?.kind === "room" && !placed.includes(preview.id) ? [preview.id] : [];
  const worn = preview?.kind === "wear" ? preview.accessory : (avatar.accessory ?? undefined);

  const choose = (r: Reward) => {
    if (r.kind === "wear" && member && owns(r)) {
      setAvatar({ ...avatar, accessory: avatar.accessory === r.accessory ? null : r.accessory }, true);
      setPreview(null);
      return;
    }
    setPreview(preview?.id === r.id ? null : r);
  };

  const status = (r: Reward) => {
    if (owns(r) && member) return r.kind === "wear" ? (avatar.accessory === r.accessory ? "쓰는 중" : "눌러서 쓰기") : "방에 놓여 있어요";
    if (owns(r)) return "로그인하면 쓸 수 있어요";
    return `${ruleHint(r.rule, cleared)} 얻어요`;
  };

  return (
    <>
      <Panel>
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Stage
            spec={{ set: "room", time: "day", partner: "mochi", hero: avatar.hero, accessory: worn, flags: [`books-${cleared.length}`, ...placed, ...roomPreview] }}
            state={{ partnerMotion: "idle", partnerKey: 0, talkKey: 0, reaction: null, meLine: "여기가 내 아지트야!" }}
          />
          {preview && (
            <p className="absolute bottom-2 left-2 bg-ink px-2 py-1 font-pixel text-[15px] leading-none text-paper">
              <span className="text-gold">미리 보기</span> {preview.name}
            </p>
          )}
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
      <p className="mt-2 text-[12px] text-paper-subtle">이야기상 성별이 정해진 장면은 그 장면을 따라요.</p>

      <h2 className="mt-6 font-pixel text-[15px] text-paper">꾸미기</h2>
      <ul className="mt-2 grid grid-cols-2 gap-3">
        {REWARDS.map((r) => {
          const usable = owns(r) && member;
          const active = preview?.id === r.id || (r.kind === "wear" && usable && avatar.accessory === r.accessory);
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => choose(r)}
                aria-pressed={active}
                className={`blk block w-full px-3 py-3 text-left ${active ? "bg-gold text-ink" : usable ? "bg-cream text-ink" : "bg-slate-block text-paper"}`}
              >
                <span className="block font-pixel text-[15px]">{r.name}</span>
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
