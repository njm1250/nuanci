"use client";

import { useEffect, useRef, useState } from "react";
import type { Choice } from "../scene";
import { Stage } from "../stage/stage";
import { useCopyLink, useDelayedReveal, useReducedMotion, useSceneFlow } from "../use-scene-flow";

const font = { fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' };

function System({ children }: { children: React.ReactNode }) {
  return <p className="mx-auto max-w-[85%] text-center text-[13px] leading-relaxed text-[#6b7378]">{children}</p>;
}

function Partner({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="animate-[rise-in_200ms_ease-out]">
      <p className="mb-1 ml-1 text-[11px] text-[#6b7378]">{name}</p>
      <p className="w-fit max-w-[78%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[15px] shadow-[0_1px_0_rgba(0,0,0,0.06)]">{children}</p>
    </div>
  );
}

function Me({ children }: { children: React.ReactNode }) {
  return (
    <p className="ml-auto w-fit max-w-[78%] animate-[rise-in_200ms_ease-out] rounded-2xl rounded-tr-sm bg-[#2f5d50] px-3.5 py-2.5 text-[15px] text-white">
      {children}
    </p>
  );
}

function Typing() {
  return (
    <p className="flex w-fit gap-1 rounded-2xl rounded-tl-sm bg-white px-3.5 py-3.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-[typing_900ms_infinite] rounded-full bg-[#6b7378]" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </p>
  );
}

function Thought({ choice }: { choice: Choice }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="max-w-[85%] animate-[rise-in_250ms_ease-out] rounded-2xl border border-dashed border-[#2f5d50]/40 bg-[#f7faf8] px-4 py-3">
      <p className="text-[11px] text-[#2f5d50]">속마음 · 이 장면에서는 이런 느낌</p>
      <p className="mt-1 text-[16px] font-semibold leading-snug">“{choice.reaction}”</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {choice.tags.map((t) => (
          <span key={t} className="rounded-md bg-[#e3ece8] px-2 py-0.5 text-[12px] text-[#2f5d50]">
            {t}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-[#4b5357]">{choice.why}</p>
      <button onClick={() => setOpen((v) => !v)} className="mt-2 text-[13px] font-semibold text-[#2f5d50]">
        {open ? "접기" : "왜 그렇게 들릴까?"}
      </button>
      {open && <p className="mt-1.5 text-[14px] leading-relaxed text-[#4b5357]">{choice.detail}</p>}
    </div>
  );
}

export function ChatPrototype() {
  const f = useSceneFlow();
  const reduced = useReducedMotion();
  const { state: copyState, copy } = useCopyLink();
  const [showMeaning, setShowMeaning] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);
  const { scene, situation, choice, phase } = f;
  const condition = phase === "base" ? "base" : "followUp";
  const revealed = useDelayedReveal(f.reactionKey, !!choice, reduced ? 0 : 650);
  const baseShown = phase !== "base" || revealed;

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
  }, [phase, f.reactionKey, revealed, reduced]);

  const pick = (id: string) => {
    setShowOthers(false);
    f.pick(id);
  };

  const asking = phase !== "transition" && !choice;

  return (
    <div style={font} className="flex h-dvh flex-col bg-[#eef0f1] break-keep text-[#1f2427]">
      <div className="relative h-[30dvh] shrink-0 overflow-hidden rounded-b-3xl bg-[#e6ddd0]">
        <Stage
          mode="mini"
          condition={condition}
          partner={revealed && choice ? choice : situation.partnerIdle}
          partnerKey={(revealed ? f.reactionKey : 0) * 10 + (condition === "base" ? 0 : 1)}
          talkKey={f.reactionKey}
          reduced={reduced}
          showContainer={revealed && !!choice?.showsContainer}
          className="!absolute inset-0"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 text-[13px]">
          <span className="font-semibold">{scene.partnerName}</span>
          <span className="text-[#6b7378]">
            {scene.relation} · {scene.place}
          </span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-5">
        <System>{scene.base.context}</System>
        <Partner name={scene.partnerName}>{scene.base.partnerLine}</Partner>
        {f.baseChoice && <Me>{f.baseChoice.line}</Me>}
        {f.baseChoice && (baseShown ? <Thought key={f.baseChoice.id} choice={f.baseChoice} /> : <Typing />)}

        {phase !== "base" && (
          <div className="my-3 animate-[rise-in_250ms_ease-out] rounded-2xl bg-[#1f2427] px-4 py-3.5 text-white">
            <p className="text-[12px] font-semibold text-[#9fd1bd]">잠깐, 만약에?</p>
            <p className="mt-1 text-[15px]">
              <span className="text-white/45 line-through">{scene.followUp.from}</span>
              <span className="mx-1.5">→</span>
              {scene.followUp.to}
            </p>
          </div>
        )}
        {phase === "followUp" && (
          <>
            <System>{scene.followUp.context}</System>
            <Partner name={scene.partnerName}>{scene.followUp.partnerLine}</Partner>
            {f.followUpChoice && <Me>{f.followUpChoice.line}</Me>}
            {f.followUpChoice && (revealed ? <Thought key={f.followUpChoice.id} choice={f.followUpChoice} /> : <Typing />)}
          </>
        )}
        {f.done && revealed && (
          <div className="mt-2 animate-[rise-in_300ms_ease-out] rounded-2xl bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
            <p className="text-[12px] font-semibold text-[#2f5d50]">오늘의 발견</p>
            <p className="mt-1.5 text-[16px] leading-relaxed">{scene.discovery}</p>
          </div>
        )}
        <div ref={logEnd} />
      </div>

      <div className="mx-auto w-full max-w-lg border-t border-black/5 bg-[#f7f8f8] px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
        {asking ? (
          <>
            <div className="flex items-center justify-between text-[12px] text-[#6b7378]">
              <span>내 마음: {situation.intent}</span>
              <button onClick={() => setShowMeaning((v) => !v)} className="shrink-0 underline underline-offset-2">
                {showMeaning ? "뜻 숨기기" : "뜻 보기"}
              </button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {situation.choices.map((c) => (
                <button key={c.id} onClick={() => pick(c.id)} className="rounded-full border border-[#2f5d50]/30 bg-white px-4 py-2.5 text-left text-[15px] active:bg-[#e3ece8]">
                  {c.line}
                  {showMeaning && <span className="ml-1.5 text-[12px] text-[#6b7378]">{c.meaning}</span>}
                </button>
              ))}
            </div>
          </>
        ) : phase === "transition" ? (
          <button onClick={f.enterFollowUp} className="w-full rounded-2xl bg-[#2f5d50] py-3.5 text-[15px] font-semibold text-white">
            다시 골라보기
          </button>
        ) : (
          <>
            {showOthers && choice && (
              <div className="mb-2.5 flex flex-wrap gap-2">
                {situation.choices
                  .filter((c) => c.id !== choice.id)
                  .map((c) => (
                    <button key={c.id} onClick={() => pick(c.id)} className="rounded-full border border-[#2f5d50]/30 bg-white px-4 py-2 text-[14px]">
                      {c.line}
                    </button>
                  ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowOthers((v) => !v)} className="rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-[14px]">
                다른 말이라면?
              </button>
              {f.done ? (
                <>
                  <button onClick={f.restart} className="flex-1 rounded-2xl bg-[#2f5d50] py-3.5 text-[15px] font-semibold text-white">
                    다음 장면
                  </button>
                  <button onClick={copy} className="rounded-2xl border border-black/10 bg-white px-4 text-[14px]">
                    {copyState === "copied" ? "복사됨" : "공유"}
                  </button>
                </>
              ) : (
                <button onClick={f.startTransition} className="flex-1 rounded-2xl bg-[#2f5d50] py-3.5 text-[15px] font-semibold text-white">
                  상황을 바꿔볼까요?
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
