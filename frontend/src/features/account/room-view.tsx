"use client";

import { Panel } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { Stage } from "@/features/stage/stage";
import { earnedRewards, REWARDS, ruleHint } from "@/features/rewards/rewards";
import { useAccount } from "./account";
import { LoginBox } from "./me-panel";

// 내 픽셀 방 초안. 끝낸 장면만큼 책장에 책이 꽂히고, 받은 보상 물건이 방에 놓인다
export function RoomView() {
  const cleared = useCleared();
  const account = useAccount();
  const earned = earnedRewards(cleared);
  const flags = [`books-${cleared.length}`, ...earned.map((r) => r.id)];
  return (
    <>
      <Panel>
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Stage
            spec={{ set: "room", time: "day", partner: "mochi", flags }}
            state={{
              partnerMotion: "idle",
              partnerKey: 0,
              talkKey: 0,
              reaction: earned.length > 0 ? "happy" : null,
              partnerLine: earned.length > 0 ? "방이 점점 근사해지는데?" : "여기가 네 방이야? 좀 휑하다…",
            }}
          />
        </div>
      </Panel>
      <p className="mt-3 text-[13px] text-paper-muted">책장에는 끝낸 장면 수만큼 책이 꽂혀요. 지금 {cleared.length}권이에요.</p>

      <h2 className="mt-6 font-pixel text-[15px] text-paper">
        방에 놓을 물건 <span className="text-paper-subtle">{earned.length} / {REWARDS.length}</span>
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {REWARDS.map((r) => {
          const got = earned.some((e) => e.id === r.id);
          return (
            <li key={r.id} className={`blk px-3 py-3 ${got ? "bg-cream text-ink" : "bg-slate-block text-paper"}`}>
              <p className="font-pixel text-[15px]">{got ? r.name : "???"}</p>
              <p className={`mt-0.5 text-[12px] ${got ? "text-ink-subtle" : "text-paper-subtle"}`}>{got ? "방에 놓였어요" : ruleHint(r.rule)}</p>
            </li>
          );
        })}
      </ul>

      {account.status === "guest" && (
        <Panel className="mt-6">
          <div className="p-4">
            <p className="font-pixel text-[15px]">내 방을 저장하려면</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">지금은 이 기기에만 저장돼요. 로그인하면 다른 기기에서도 내 방을 볼 수 있어요.</p>
            <LoginBox next="/me/room" google={account.google} />
          </div>
        </Panel>
      )}
    </>
  );
}
