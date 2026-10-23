"use client";

import { useState } from "react";
import { batang } from "../fonts";
import { Stage } from "../stage/stage";
import { useCopyLink, useDelayedReveal, useReducedMotion, useSceneFlow } from "../use-scene-flow";

export function CinemaPrototype() {
  const f = useSceneFlow();
  const reduced = useReducedMotion();
  const { state: copyState, copy } = useCopyLink();
  const [showMeaning, setShowMeaning] = useState(false);
  const [panel, setPanel] = useState<"detail" | "others" | null>(null);
  const { scene, situation, choice, phase } = f;
  const condition = phase === "base" ? "base" : "followUp";
  const revealed = useDelayedReveal(f.reactionKey, !!choice, reduced ? 0 : 1200);
  const shot = !choice ? "wide" : revealed ? "partner" : "me";

  const pick = (id: string) => {
    setPanel(null);
    f.pick(id);
  };

  return (
    <div className={`${batang.className} relative h-dvh overflow-hidden break-keep bg-[#0f0e0d] text-[#efe8dc]`}>
      <Stage
        mode="cinema"
        shot={shot}
        condition={condition}
        partner={revealed && choice ? choice : situation.partnerIdle}
        partnerKey={(revealed ? f.reactionKey : 0) * 10 + (condition === "base" ? 0 : 1)}
        talkKey={f.reactionKey}
        reduced={reduced}
        showContainer={revealed && !!choice?.showsContainer}
        className="!absolute inset-0"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[8dvh] bg-black" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62dvh] bg-gradient-to-t from-black via-black/85 to-transparent" />

      <header className="absolute left-5 top-[calc(8dvh+14px)] text-[11px] tracking-[0.35em] text-white/60">
        SCENE {String(scene.number).padStart(2, "0")} — {scene.title}
        {condition === "followUp" && <span className="ml-3 tracking-normal text-[#e3a26f]">만약에 · {scene.followUp.to}</span>}
      </header>

      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-xl px-6 pb-[max(env(safe-area-inset-bottom),28px)]">
        {phase === "transition" ? null : !choice ? (
          <div key={`ask-${phase}`} className="animate-[rise-in_400ms_ease-out]">
            <p className="text-[13px] italic leading-relaxed text-white/60">{situation.context}</p>
            <p className="mt-4 text-center text-[20px] leading-snug [text-shadow:0_1px_8px_#000]">
              <span className="mr-2 text-[13px] text-white/50">{scene.partnerName}</span>
              {situation.partnerLine}
            </p>
            <p className="mt-6 text-[13px] text-white/50">내 마음 — {situation.intent}</p>
            <ul className="mt-3 border-t border-white/10">
              {situation.choices.map((c) => (
                <li key={c.id} className="border-b border-white/10">
                  <button onClick={() => pick(c.id)} className="group w-full py-3.5 text-left">
                    <span className="text-[19px] group-hover:text-white">— {c.line}</span>
                    {showMeaning && <span className="ml-2 text-[13px] text-white/45">{c.meaning}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={() => setShowMeaning((v) => !v)} className="mt-3 text-[12px] text-white/45 underline underline-offset-4">
              {showMeaning ? "뜻 숨기기" : "뜻 보기"}
            </button>
          </div>
        ) : !revealed ? (
          <p key={`line-${f.reactionKey}`} className="animate-[fade-in_250ms] pb-10 text-center text-[22px] [text-shadow:0_1px_8px_#000]">
            {choice.line}
          </p>
        ) : (
          <div key={`react-${f.reactionKey}`} className="animate-[rise-in_400ms_ease-out]">
            <p className="text-center text-[13px] text-white/45">이 장면에서는 이런 느낌</p>
            <p className="mt-2 text-center text-[22px] italic leading-snug [text-shadow:0_1px_8px_#000]">({choice.reaction})</p>
            <p className="mt-3 text-center text-[12px] tracking-[0.2em] text-[#e3a26f]">{choice.tags.join("  ·  ")}</p>
            <p className="mt-4 text-[14px] leading-relaxed text-white/70">{choice.why}</p>

            {panel && (
              <div className="mt-4 animate-[fade-in_200ms] border-l border-[#e3a26f]/60 pl-4 text-[14px] leading-relaxed text-white/75">
                {panel === "detail" ? (
                  choice.detail
                ) : (
                  <ul className="space-y-3">
                    {situation.choices
                      .filter((c) => c.id !== choice.id)
                      .map((c) => (
                        <li key={c.id}>
                          <button onClick={() => pick(c.id)} className="text-left">
                            <span className="block text-[16px] text-white">— {c.line}</span>
                            <span className="text-[13px] italic">({c.reaction})</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-4 text-[13px] text-white/55">
              <button onClick={() => setPanel(panel === "detail" ? null : "detail")} className="underline underline-offset-4">
                왜 그렇게 들릴까?
              </button>
              <button onClick={() => setPanel(panel === "others" ? null : "others")} className="underline underline-offset-4">
                다른 말이라면?
              </button>
            </div>

            {f.done ? (
              <div className="mt-6 border-t border-white/15 pt-5">
                <p className="text-[11px] tracking-[0.35em] text-white/45">오늘의 발견</p>
                <p className="mt-2 text-[17px] leading-relaxed">{scene.discovery}</p>
                <div className="mt-5 flex gap-2">
                  <button onClick={f.restart} className="flex-1 bg-[#efe8dc] py-3.5 text-[15px] font-bold text-black">
                    다음 장면
                  </button>
                  <button onClick={copy} className="flex-1 border border-white/25 py-3.5 text-[14px]">
                    {copyState === "copied" ? "링크를 복사했어요" : "친구에게 보내기"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={f.startTransition} className="mt-6 w-full bg-[#efe8dc] py-3.5 text-[15px] font-bold text-black">
                잠깐, 만약에? →
              </button>
            )}
          </div>
        )}
      </div>

      {phase === "transition" && (
        <div className="absolute inset-0 flex animate-[fade-in_500ms] flex-col items-center justify-center bg-black px-8 text-center">
          <p className="text-[12px] tracking-[0.4em] text-white/45">잠깐, 만약에?</p>
          <p className="mt-5 text-[24px] leading-snug">친구가 이미 배부르다고 했다면</p>
          <p className="mt-8 text-[14px] text-white/40 line-through">{scene.followUp.from}</p>
          <p className="mt-1 text-[15px] text-[#e3a26f]">{scene.followUp.to}</p>
          <button onClick={f.enterFollowUp} className="mt-12 border border-white/30 px-8 py-3 text-[14px]">
            장면으로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}
