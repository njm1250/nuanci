"use client";

import { useState } from "react";
import { plex } from "../fonts";
import { useCopyLink, useReducedMotion, useSceneFlow } from "../use-scene-flow";
import { FlatStage } from "./flat-stage";

const primary = "mt-6 w-full bg-[#1b1b1a] py-3.5 text-[15px] font-semibold text-[#f2f0eb] active:translate-y-px";

export function FlatPrototype() {
  const f = useSceneFlow();
  const reduced = useReducedMotion();
  const { state: copyState, copy } = useCopyLink();
  const [pixel, setPixel] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [panel, setPanel] = useState<"detail" | "others" | null>(null);
  const { scene, situation, choice, phase } = f;
  const later = phase !== "base";

  const pick = (id: string) => {
    setPanel(null);
    f.pick(id);
  };

  return (
    <div className={`${plex.className} min-h-dvh bg-[#f2f0eb] text-[#1b1b1a] break-keep`}>
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
        <header className="flex items-center justify-between px-4 py-3 text-[13px]">
          <span>
            {scene.number}. {scene.title}
          </span>
          <div className="flex border-2 border-[#1b1b1a] text-[12px]">
            {[false, true].map((v) => (
              <button
                key={String(v)}
                onClick={() => setPixel(v)}
                aria-pressed={pixel === v}
                className={`px-2.5 py-0.5 ${pixel === v ? "bg-[#1b1b1a] text-[#f2f0eb]" : ""}`}
              >
                {v ? "픽셀" : "선명"}
              </button>
            ))}
          </div>
        </header>

        <div className="aspect-[16/11] w-full border-y-2 border-[#1b1b1a]">
          <FlatStage
            pixel={pixel}
            later={later}
            partnerMotion={choice?.motion ?? situation.partnerIdle.motion}
            partnerKey={f.reactionKey * 10 + (later ? 1 : 0)}
            talkKey={f.reactionKey}
            reaction={choice?.expression ?? null}
            meLine={choice?.line}
            partnerLine={phase === "transition" ? scene.followUp.partnerLine : situation.partnerLine}
            container={!!choice?.showsContainer}
            reduced={reduced}
          />
        </div>

        <main className="flex-1 px-4 pb-10 pt-5">
          {phase === "transition" ? (
            <div key="transition" className="animate-[rise-in_220ms_ease-out]">
              <p className="text-[13px] font-semibold">잠깐, 만약에?</p>
              <p className="mt-1 text-[22px] font-semibold leading-snug">친구가 이미 배부르다고 했다면?</p>
              <p className="mt-4 text-[14px] text-[#1b1b1a]/50 line-through">{scene.followUp.from}</p>
              <p className="text-[15px] font-semibold">{scene.followUp.to}</p>
              <button onClick={f.enterFollowUp} className={primary}>
                다시 골라보기
              </button>
            </div>
          ) : !choice ? (
            <div key={`ask-${phase}`} className="animate-[rise-in_220ms_ease-out]">
              {later && <p className="mb-3 inline-block bg-[#1b1b1a] px-2 py-0.5 text-[12px] text-[#f2f0eb]">만약에 · {scene.followUp.to}</p>}
              <p className="text-[16px] leading-relaxed">{situation.context}</p>
              <p className="mt-1 text-[14px] text-[#1b1b1a]/60">내 마음: {situation.intent}</p>
              <ol className="mt-5 border-t-2 border-[#1b1b1a]">
                {situation.choices.map((c, i) => (
                  <li key={c.id} className="border-b-2 border-[#1b1b1a]">
                    <button onClick={() => pick(c.id)} className="flex w-full items-baseline gap-3 py-3.5 text-left hover:bg-white">
                      <span className="w-4 shrink-0 text-[13px] text-[#1b1b1a]/45">{i + 1}</span>
                      <span>
                        <span className="text-[17px] font-semibold">{c.line}</span>
                        {showMeaning && <span className="block text-[13px] text-[#1b1b1a]/60">{c.meaning}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <button onClick={() => setShowMeaning((v) => !v)} className="mt-3 text-[13px] underline underline-offset-4">
                {showMeaning ? "뜻 숨기기" : "뜻 보기"}
              </button>
            </div>
          ) : (
            <div key={`react-${choice.id}`} className="animate-[rise-in_220ms_ease-out]">
              <p className="text-[13px] text-[#1b1b1a]/50">{scene.partnerName}의 속마음</p>
              <p className="mt-1 text-[21px] font-semibold leading-snug">{choice.reaction}</p>
              <p className="mt-2.5 flex flex-wrap gap-1.5 text-[12px]">
                {choice.tags.map((t) => (
                  <span key={t} className="border border-[#1b1b1a] px-1.5 py-0.5">
                    {t}
                  </span>
                ))}
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-[#1b1b1a]/80">{choice.why}</p>

              <div className="mt-4 flex gap-4 text-[13px]">
                <button onClick={() => setPanel(panel === "detail" ? null : "detail")} className={`underline underline-offset-4 ${panel === "detail" ? "font-semibold" : ""}`}>
                  왜 그렇게 들릴까?
                </button>
                <button onClick={() => setPanel(panel === "others" ? null : "others")} className={`underline underline-offset-4 ${panel === "others" ? "font-semibold" : ""}`}>
                  다른 말이라면?
                </button>
              </div>
              {panel === "detail" && <p className="mt-3 border-l-2 border-[#1b1b1a] pl-3 text-[14px] leading-relaxed">{choice.detail}</p>}
              {panel === "others" && (
                <ul className="mt-3 border-t-2 border-[#1b1b1a]">
                  {situation.choices
                    .filter((c) => c.id !== choice.id)
                    .map((c) => (
                      <li key={c.id} className="border-b-2 border-[#1b1b1a]">
                        <button onClick={() => pick(c.id)} className="w-full py-3 text-left hover:bg-white">
                          <span className="block text-[16px] font-semibold">{c.line}</span>
                          <span className="text-[13px] text-[#1b1b1a]/60">{c.reaction}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}

              {f.done ? (
                <>
                  <div className="mt-6 border-2 border-[#1b1b1a] bg-white p-4">
                    <p className="text-[12px] font-semibold">오늘의 발견</p>
                    <p className="mt-1.5 text-[16px] leading-relaxed">{scene.discovery}</p>
                  </div>
                  <button onClick={f.restart} className={primary}>
                    다음 장면
                  </button>
                  <button onClick={copy} className="mt-2 w-full border-2 border-[#1b1b1a] py-3 text-[14px]">
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
        </main>
      </div>
    </div>
  );
}
