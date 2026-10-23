"use client";

import { useState } from "react";
import { plex } from "../fonts";
import type { Choice } from "../scene";
import { Stage } from "../stage/stage";
import { useCopyLink, useReducedMotion, useSceneFlow } from "../use-scene-flow";

function ChoiceRow({ choice, onPick }: { choice: Choice; onPick: () => void }) {
  const [showMeaning, setShowMeaning] = useState(false);
  return (
    <li className="flex items-stretch rounded-2xl border border-[#2b2622]/10 bg-white transition-colors hover:border-[#2b2622]/30">
      <button onClick={onPick} className="flex-1 px-4 py-3.5 text-left">
        <span className="block text-[16px] font-semibold">{choice.line}</span>
        {showMeaning && <span className="mt-0.5 block text-[13px] text-[#7a7064]">{choice.meaning}</span>}
      </button>
      <button
        onClick={() => setShowMeaning((v) => !v)}
        aria-expanded={showMeaning}
        className="shrink-0 px-3.5 text-[12px] text-[#8a7f72] underline-offset-2 hover:underline"
      >
        {showMeaning ? "닫기" : "뜻"}
      </button>
    </li>
  );
}

function Disclosure({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div>
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between py-3.5 text-left text-[14px]">
        {label}
        <span className={`text-[#8a7f72] transition-transform ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && <div className="animate-[rise-in_200ms_ease-out] pb-4 text-[14px] leading-relaxed text-[#4a433b]">{children}</div>}
    </div>
  );
}

const primary =
  "mt-6 w-full rounded-2xl bg-[#2b2622] px-5 py-4 text-[15px] font-semibold text-[#f6f1e8] active:scale-[0.99]";

export function DioramaPrototype() {
  const f = useSceneFlow();
  const reduced = useReducedMotion();
  const { state: copyState, copy } = useCopyLink();
  const [open, setOpen] = useState<"detail" | "others" | null>(null);
  const { scene, situation, choice, phase } = f;
  const condition = phase === "base" ? "base" : "followUp";

  const pick = (id: string) => {
    setOpen(null);
    f.pick(id);
  };

  const bubbles = choice ? { me: choice.line, thought: choice.reaction } : { partner: situation.partnerLine };

  return (
    <div className={`${plex.className} flex h-dvh flex-col bg-[#f1ebe1] break-keep text-[#2b2622] md:flex-row`}>
      <div className="relative h-[46dvh] shrink-0 md:h-auto md:flex-1">
        <Stage
          mode="iso"
          condition={condition}
          partner={choice ?? situation.partnerIdle}
          partnerKey={f.reactionKey * 10 + (condition === "base" ? 0 : 1)}
          talkKey={f.reactionKey}
          bubbles={bubbles}
          reduced={reduced}
          showContainer={!!choice?.showsContainer}
          className="!absolute inset-0"
        />
        <div className="pointer-events-none absolute left-4 top-4 flex gap-1.5 text-[12px]">
          <span className="rounded-full bg-white/80 px-2.5 py-1">{scene.relation}</span>
          <span className="rounded-full bg-white/80 px-2.5 py-1">{scene.place}</span>
        </div>
        {condition === "followUp" && (
          <div className="pointer-events-none absolute right-4 top-4 animate-[fade-in_300ms] rounded-full bg-[#b4583c] px-2.5 py-1 text-[12px] font-semibold text-white">
            만약에 · {scene.followUp.to}
          </div>
        )}
      </div>

      <section className="relative -mt-6 flex-1 overflow-y-auto rounded-t-[1.75rem] bg-[#fffdf9] px-5 pb-10 pt-6 shadow-[0_-1px_0_rgba(0,0,0,0.05)] md:mt-0 md:w-[440px] md:flex-none md:rounded-none md:px-9 md:pt-12">
        {phase === "transition" ? (
          <div key="transition" className="animate-[rise-in_260ms_ease-out]">
            <p className="text-[13px] font-semibold text-[#b4583c]">잠깐, 만약에?</p>
            <p className="mt-2 text-[22px] font-semibold leading-snug">친구가 이미 배부르다고 했다면?</p>
            <div className="mt-5 space-y-2 rounded-2xl bg-[#f4eee4] p-4 text-[14px]">
              <p className="text-[#8a7f72] line-through decoration-[#2b2622]/30">{scene.followUp.from}</p>
              <p className="font-semibold">→ {scene.followUp.to}</p>
            </div>
            <button onClick={f.enterFollowUp} className={primary}>
              다시 골라보기
            </button>
          </div>
        ) : !choice ? (
          <div key={`ask-${phase}`} className="animate-[rise-in_260ms_ease-out]">
            <p className="text-[12px] tracking-wide text-[#8a7f72]">
              장면 {scene.number} · {scene.title}
            </p>
            <p className="mt-3 text-[17px] leading-relaxed">{situation.context}</p>
            <p className="mt-3 text-[14px] text-[#5d554c]">
              <span className="mr-2 rounded-md bg-[#efe6d6] px-1.5 py-0.5 text-[12px]">내 마음</span>
              {situation.intent}
            </p>
            <p className="mt-7 text-[12px] text-[#8a7f72]">말을 고르면 바로 보내져요</p>
            <ul className="mt-2 space-y-2">
              {situation.choices.map((c) => (
                <ChoiceRow key={c.id} choice={c} onPick={() => pick(c.id)} />
              ))}
            </ul>
          </div>
        ) : (
          <div key={`react-${choice.id}`} className="animate-[rise-in_260ms_ease-out]">
            <p className="text-[12px] text-[#8a7f72]">이 장면에서는 이런 느낌</p>
            <p className="mt-1.5 text-[21px] font-semibold leading-snug">“{choice.reaction}”</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {choice.tags.map((t) => (
                <span key={t} className="rounded-full border border-[#2b2622]/15 px-2.5 py-1 text-[12px]">
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-[#4a433b]">{choice.why}</p>

            <div className="mt-5 divide-y divide-black/5 border-y border-black/5">
              <Disclosure label="왜 그렇게 들릴까?" open={open === "detail"} onToggle={() => setOpen(open === "detail" ? null : "detail")}>
                {choice.detail}
              </Disclosure>
              <Disclosure label="다른 말이라면?" open={open === "others"} onToggle={() => setOpen(open === "others" ? null : "others")}>
                <ul className="space-y-2">
                  {situation.choices
                    .filter((c) => c.id !== choice.id)
                    .map((c) => (
                      <li key={c.id}>
                        <button onClick={() => pick(c.id)} className="w-full rounded-xl bg-[#f4eee4] px-3.5 py-3 text-left">
                          <span className="block font-semibold text-[#2b2622]">{c.line}</span>
                          <span className="text-[13px]">“{c.reaction}”</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </Disclosure>
            </div>

            {f.done ? (
              <>
                <div className="mt-6 rounded-2xl bg-[#2b2622] p-5 text-[#f6f1e8]">
                  <p className="text-[12px] text-[#f6f1e8]/60">오늘의 발견</p>
                  <p className="mt-2 text-[17px] leading-relaxed">{scene.discovery}</p>
                </div>
                <button onClick={f.restart} className={primary}>
                  다음 장면
                </button>
                <button onClick={copy} className="mt-2 w-full rounded-2xl border border-[#2b2622]/15 px-5 py-3.5 text-[14px]">
                  {copyState === "copied" ? "링크를 복사했어요" : "친구는 뭐라고 할까? 링크 복사"}
                </button>
              </>
            ) : (
              <button onClick={f.startTransition} className={primary}>
                상황을 바꿔볼까요?
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
