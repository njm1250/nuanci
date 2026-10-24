"use client";

import { earnedRewards, REWARDS, ruleHint } from "@/features/rewards/rewards";
import { Panel } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { Stage } from "@/features/stage/stage";
import { useAccount } from "./account";
import { GoogleButton } from "./google-button";

// 아지트 초안. 해 본 장면만큼 책장에 책이 꽂히고, 로그인하면 받은 물건이 놓인다.
// 비로그인이면 받을 조건을 채운 물건을 보여만 주고 놓지는 않는다
export function RoomView() {
  const cleared = useCleared();
  const account = useAccount();
  const member = account.status === "member";
  const placed = member ? earnedRewards(cleared, true) : [];
  const waiting = member ? [] : earnedRewards(cleared, false);
  const flags = [`books-${cleared.length}`, ...placed.map((r) => r.id)];
  const line = member
    ? placed.length > 1
      ? "아지트가 점점 근사해지는데?"
      : "장면을 더 하면 물건이 생겨!"
    : waiting.length > 0
      ? `물건 ${waiting.length}개가 놓일 자리를 기다리고 있어!`
      : "여기가 네 아지트야? 좀 휑하다…";

  return (
    <>
      <Panel>
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Stage
            spec={{ set: "room", time: "day", partner: "mochi", flags }}
            state={{ partnerMotion: "idle", partnerKey: 0, talkKey: 0, reaction: null, partnerLine: line }}
          />
        </div>
      </Panel>
      <p className="mt-3 text-[13px] text-paper-muted">책장에는 해 본 장면 수만큼 책이 꽂혀요. 지금 {cleared.length}권이에요.</p>

      {!member && account.status !== "loading" && (
        <Panel className="mt-5">
          <div className="p-4">
            <p className="font-pixel text-[15px]">{waiting.length > 0 ? `받을 수 있는 물건 ${waiting.length}개` : "아지트를 꾸미려면"}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">로그인하면 받은 물건이 아지트에 놓이고, 가입 선물로 고양이 쿠션도 받아요.</p>
            <GoogleButton next="/me/room" enabled={account.google} />
          </div>
        </Panel>
      )}

      <h2 className="mt-6 font-pixel text-[15px] text-paper">
        아지트 물건 <span className="text-paper-subtle">{placed.length} / {REWARDS.length}</span>
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {REWARDS.map((r) => {
          const isPlaced = placed.some((e) => e.id === r.id);
          const isWaiting = waiting.some((e) => e.id === r.id);
          return (
            <li key={r.id} className={`blk px-3 py-3 ${isPlaced ? "bg-cream text-ink" : isWaiting ? "bg-gold text-ink" : "bg-slate-block text-paper"}`}>
              <p className="font-pixel text-[15px]">{isPlaced || isWaiting ? r.name : "???"}</p>
              <p className={`mt-0.5 text-[12px] ${isPlaced || isWaiting ? "text-ink-subtle" : "text-paper-subtle"}`}>
                {isPlaced ? "아지트에 놓였어요" : isWaiting ? "로그인하면 놓여요" : ruleHint(r.rule)}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
