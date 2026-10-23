"use client";

import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { useMemo, useState } from "react";
import { PixelStage } from "../kit/pixel-stage";
import type { StageSpec } from "../kit/types";
import type { Choice, Scene } from "../scene";
import { SCENES } from "../scenes";
import { useCopyLink, useReducedMotion, useSceneFlow } from "../use-scene-flow";

const ACCENT = "text-[#b4452f]";
const primary = "h-12 rounded-xl bg-[#191917] px-6 text-[15px] font-semibold text-white active:scale-[0.98] transition-transform";
const secondary = "h-12 rounded-xl border border-[#191917]/15 px-5 text-[15px] font-medium active:scale-[0.98] transition-transform";

function Sheet({ choice, others, onPick, onClose }: { choice: Choice; others: Choice[]; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/25 animate-[fade-in_150ms]" onClick={onClose}>
      <div
        className="max-h-[78%] animate-[sheet-up_220ms_ease-out] overflow-y-auto rounded-t-2xl bg-white px-5 pb-8 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1 w-9 rounded-full bg-[#191917]/15" />
        <p className="mt-5 text-[13px] font-semibold text-[#191917]/45">왜 그렇게 들릴까?</p>
        <p className="mt-1.5 text-[15px] leading-relaxed">{choice.detail}</p>
        <p className="mt-7 text-[13px] font-semibold text-[#191917]/45">다른 말이라면?</p>
        <ul className="mt-1 divide-y divide-[#191917]/10">
          {others.map((c) => (
            <li key={c.id}>
              <button onClick={() => onPick(c.id)} className="w-full py-3.5 text-left">
                <span className="block text-[16px] font-medium">{c.line}</span>
                <span className="mt-0.5 block text-[13px] text-[#191917]/55">{c.reaction}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ScenePlayer({ scene, onNext }: { scene: Scene; onNext: () => void }) {
  const f = useSceneFlow(scene);
  const reduced = useReducedMotion();
  const { state: copyState, copy } = useCopyLink();
  const [showMeaning, setShowMeaning] = useState(false);
  const [sheet, setSheet] = useState(false);
  const { situation, choice, phase } = f;
  const later = phase !== "base";
  const stageSituation = later ? scene.followUp : scene.base;

  const spec = useMemo<StageSpec>(() => {
    const base = stageSituation.stage!;
    return { ...base, flags: [...(base.flags ?? []), ...(choice?.flags ?? [])] };
  }, [stageSituation, choice]);

  const pick = (id: string) => {
    setSheet(false);
    f.pick(id);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative aspect-[4/3] w-full shrink-0">
        <PixelStage
          spec={spec}
          reduced={reduced}
          bubbleClassName="pd font-medium"
          state={{
            partnerMotion: choice?.motion ?? stageSituation.partnerIdle.motion,
            partnerKey: f.reactionKey * 10 + (later ? 1 : 0),
            talkKey: f.reactionKey,
            reaction: choice?.expression ?? null,
            meLine: choice?.line,
            partnerLine: stageSituation.partnerLine,
            meTurn: phase !== "transition" && !choice,
          }}
        />
        {later && (
          <span className="absolute bottom-3 left-3 animate-[fade-in_300ms] bg-white/90 px-2 py-1 text-[12px] font-medium">
            만약에 · {scene.followUp.to}
          </span>
        )}
        {phase === "transition" && !reduced && <div className="pointer-events-none absolute inset-0 animate-[wipe_520ms_ease-in-out_both] bg-[#191917]" />}
      </div>

      <section className="flex flex-1 flex-col px-5 pb-6 pt-5">
        {phase === "transition" ? (
          <div key="transition" className="flex flex-1 flex-col animate-[rise-in_200ms_ease-out]">
            <p className={`text-[13px] font-semibold ${ACCENT}`}>만약에</p>
            <p className="mt-1 text-[20px] font-semibold leading-snug">{scene.followUp.prompt.replace(/^잠깐,\s*/, "")}</p>
            <p className="mt-3 text-[14px] text-[#191917]/55">
              <s>{scene.followUp.from}</s> → <span className="text-[#191917]">{scene.followUp.to}</span>
            </p>
            <button onClick={f.enterFollowUp} className={`${primary} mt-auto w-full`}>
              다시 골라보기
            </button>
          </div>
        ) : !choice ? (
          <div key={`ask-${phase}`} className="flex flex-1 flex-col animate-[rise-in_200ms_ease-out]">
            <p className="text-[14px] leading-relaxed text-[#191917]/55">{situation.context}</p>
            <p className="mt-1.5 text-[20px] font-semibold leading-snug">{situation.intent}</p>
            <div className="mt-6 flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[#191917]/45">뭐라고 말할까?</span>
              <button onClick={() => setShowMeaning((v) => !v)} aria-pressed={showMeaning} className="text-[#191917]/55">
                {showMeaning ? "뜻 숨기기" : "뜻 보기"}
              </button>
            </div>
            <ul className="mt-1 divide-y divide-[#191917]/10 border-y border-[#191917]/10">
              {situation.choices.map((c) => (
                <li key={c.id}>
                  <button onClick={() => pick(c.id)} className="flex w-full items-center justify-between gap-3 py-4 text-left active:bg-[#191917]/5">
                    <span>
                      <span className="block text-[17px] font-medium leading-snug">{c.line}</span>
                      {showMeaning && <span className="mt-0.5 block text-[13px] text-[#191917]/50">{c.meaning}</span>}
                    </span>
                    <span className="text-[18px] text-[#191917]/25">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div key={`react-${choice.id}`} className="flex flex-1 flex-col animate-[rise-in_200ms_ease-out]">
            <p className="text-[13px] font-semibold text-[#191917]/45">{scene.partnerName}의 속마음</p>
            <p className="mt-1 text-[20px] font-semibold leading-snug">{choice.reaction}</p>
            <p className={`mt-2 text-[13px] font-medium ${ACCENT}`}>{choice.tags.join(" · ")}</p>
            {f.done ? (
              <div className="mt-5 border-l-2 border-[#b4452f] pl-3">
                <p className={`text-[12px] font-semibold ${ACCENT}`}>오늘의 발견</p>
                <p className="mt-0.5 text-[15px] leading-relaxed">{scene.discovery}</p>
              </div>
            ) : (
              <p className="mt-3 text-[15px] leading-relaxed text-[#191917]/70">{choice.why}</p>
            )}
            <button onClick={() => setSheet(true)} className="mt-3 self-start text-[14px] text-[#191917]/55 underline underline-offset-4">
              더 알아보기
            </button>
            <div className="mt-auto flex gap-2 pt-6">
              {f.done ? (
                <>
                  <button onClick={copy} className={secondary}>
                    {copyState === "copied" ? "복사됨" : "공유"}
                  </button>
                  <button onClick={onNext} className={`${primary} flex-1`}>
                    다음 장면
                  </button>
                </>
              ) : (
                <button onClick={f.startTransition} className={`${primary} flex-1`}>
                  상황을 바꿔보기
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {sheet && choice && (
        <Sheet choice={choice} others={situation.choices.filter((c) => c.id !== choice.id)} onPick={pick} onClose={() => setSheet(false)} />
      )}
    </div>
  );
}

export function PixelPlayer() {
  const [index, setIndex] = useState(0);
  const scene = SCENES[index];
  return (
    <div className="pd flex min-h-dvh justify-center bg-[#e9e7e1] text-[#191917] break-keep">
      <div className="flex h-dvh w-full max-w-[480px] flex-col bg-[#f6f5f1]">
        <header className="flex h-12 shrink-0 items-center justify-between px-5 text-[14px]">
          <span>
            <span className="text-[#191917]/45">장면 {scene.number}</span>
            <span className="ml-2 font-semibold">{scene.title}</span>
          </span>
        </header>
        <ScenePlayer key={scene.number} scene={scene} onNext={() => setIndex((i) => (i + 1) % SCENES.length)} />
      </div>
    </div>
  );
}
