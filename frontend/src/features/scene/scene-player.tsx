"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PixelStage } from "@/features/stage/pixel-stage";
import type { StageSpec } from "@/features/stage/types";
import { BlockButton, Panel } from "./block-ui";
import type { Choice, Scene } from "./types";
import { useCopyLink, useReducedMotion, useSceneFlow } from "./use-scene-flow";

function ExplainSheet({ choice, others, onPick, onClose }: { choice: Choice; others: Choice[]; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex animate-[fade-in_150ms] items-end bg-black/45 p-4" onClick={onClose}>
      <div className="w-full animate-[sheet-up_200ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        <Panel>
          <div className="max-h-[70dvh] overflow-y-auto p-5">
            <p className="font-pixel text-[14px] text-ink/55">왜 그렇게 들릴까?</p>
            <p className="mt-1.5 text-[15px] leading-relaxed">{choice.detail}</p>
            <p className="mt-6 font-pixel text-[14px] text-ink/55">다른 말이라면?</p>
            <ul className="mt-3 space-y-4">
              {others.map((c) => (
                <li key={c.id}>
                  <BlockButton onClick={() => onPick(c.id)} className="w-full text-left">
                    <span className="block text-[15px] font-semibold">{c.line}</span>
                    <span className="block text-[13px] text-ink/55">{c.reaction}</span>
                  </BlockButton>
                </li>
              ))}
            </ul>
            <BlockButton onClick={onClose} className="mt-6 w-full" faceClassName="text-center font-pixel text-[14px]">
              닫기
            </BlockButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// 장면 하나를 처음 질문부터 오늘의 발견까지 진행하는 화면
export function ScenePlayer({ scene, nextId }: { scene: Scene; nextId: string }) {
  const f = useSceneFlow(scene);
  const reduced = useReducedMotion();
  const { state: copyState, copy } = useCopyLink(`/scenes/${scene.id}`);
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
    <div className="flex min-h-dvh justify-center bg-night-deep break-keep text-ink">
      <main className="relative flex h-dvh w-full max-w-[480px] flex-col bg-night">
        <header className="flex h-12 shrink-0 items-center px-4">
          <p className="font-pixel text-[14px] text-paper">
            <span className="text-paper/50">장면 {scene.number}</span>
            <span className="ml-2">{scene.title}</span>
          </p>
        </header>

        <div className="px-4">
          <Panel>
            <div className="relative aspect-[4/3] overflow-hidden">
              <PixelStage
                spec={spec}
                reduced={reduced}
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
                <p className="absolute bottom-2 left-2 animate-[fade-in_300ms] bg-ink px-2 py-0.5 font-pixel text-[13px] text-paper">
                  <span className="text-gold">만약에</span> {scene.followUp.to}
                </p>
              )}
              {phase === "transition" && !reduced && <div className="pointer-events-none absolute inset-0 animate-[wipe_520ms_ease-in-out_both] bg-ink" />}
            </div>
          </Panel>
        </div>

        <section className="flex flex-1 flex-col px-4 pb-6 pt-5">
          {phase === "transition" ? (
            <div key="transition" className="flex flex-1 flex-col">
              <Panel>
                <div className="p-5">
                  <p className="font-pixel text-[14px] text-rust">만약에…</p>
                  <p className="mt-1 font-pixel-title text-[22px] leading-tight">{scene.followUp.prompt.replace(/^잠깐,\s*/, "")}</p>
                  <p className="mt-3 text-[14px] text-ink/60">
                    <s>{scene.followUp.from}</s> → <span className="text-ink">{scene.followUp.to}</span>
                  </p>
                </div>
              </Panel>
              <BlockButton gold onClick={f.enterFollowUp} className="mt-auto w-full" faceClassName="text-center font-pixel text-[15px]">
                다시 골라보기
              </BlockButton>
            </div>
          ) : !choice ? (
            <div key={`ask-${phase}`} className="flex flex-1 flex-col">
              <p className="text-[14px] leading-relaxed text-paper/60">{situation.context}</p>
              <p className="mt-1.5 font-pixel-title text-[22px] leading-tight text-paper">{situation.intent}</p>
              <div className="mt-5 flex items-center justify-between font-pixel text-[14px]">
                <span className="text-paper/55">뭐라고 말할까?</span>
                <button onClick={() => setShowMeaning((v) => !v)} aria-pressed={showMeaning} className="text-gold underline underline-offset-4">
                  {showMeaning ? "뜻 숨기기" : "뜻 보기"}
                </button>
              </div>
              <ul className="mt-3 space-y-4">
                {situation.choices.map((c, i) => (
                  <li key={c.id}>
                    <BlockButton onClick={() => pick(c.id)} className="w-full text-left" faceClassName="flex items-center gap-3">
                      <span className="grid size-6 shrink-0 place-items-center bg-ink font-pixel text-[13px] text-paper">{i + 1}</span>
                      <span>
                        <span className="block text-[16px] font-semibold leading-snug">{c.line}</span>
                        {showMeaning && <span className="block text-[13px] text-ink/55">{c.meaning}</span>}
                      </span>
                    </BlockButton>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div key={`react-${choice.id}`} className="flex flex-1 flex-col">
              <Panel dark>
                <div className="p-4">
                  <p className="font-pixel text-[13px] text-paper/50">{scene.partnerName}의 속마음</p>
                  <p className="mt-1 font-pixel-title text-[22px] leading-tight">{choice.reaction}</p>
                  <p className="mt-2 font-pixel text-[13px] text-gold">{choice.tags.join(" · ")}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-paper/75">{choice.why}</p>
                </div>
              </Panel>
              {f.done && (
                <div className="mt-5 flex animate-[pop_320ms_ease-out] items-start gap-3">
                  <span className="blk-frame-sm mt-0.5 shrink-0">
                    <span className="blk block size-7 bg-gold shadow-[inset_4px_4px_0_#f4d27a,inset_-4px_-4px_0_#a87a1c]" />
                  </span>
                  <div>
                    <p className="font-pixel text-[14px] text-gold">발견 블록을 얻었어요</p>
                    <p className="mt-0.5 text-[15px] leading-relaxed text-paper">{scene.discovery}</p>
                  </div>
                </div>
              )}
              <div className="mt-auto flex gap-3 pt-6">
                <BlockButton onClick={() => setSheet(true)} faceClassName="font-pixel text-[14px]">
                  더 알아보기
                </BlockButton>
                {f.done ? (
                  <>
                    <BlockButton onClick={copy} faceClassName="font-pixel text-[14px]">
                      {copyState === "copied" ? "복사됨" : "공유"}
                    </BlockButton>
                    <Link href={`/scenes/${nextId}`} className="blk-btn blk-btn-gold block flex-1">
                      <span className="blk block bg-gold px-3 py-2.5 text-center font-pixel text-[15px]">다음 장면</span>
                    </Link>
                  </>
                ) : (
                  <BlockButton gold onClick={f.startTransition} className="flex-1" faceClassName="text-center font-pixel text-[15px]">
                    상황을 바꿔보기
                  </BlockButton>
                )}
              </div>
            </div>
          )}
        </section>

        {sheet && choice && <ExplainSheet choice={choice} others={situation.choices.filter((c) => c.id !== choice.id)} onPick={pick} onClose={() => setSheet(false)} />}
      </main>
    </div>
  );
}
