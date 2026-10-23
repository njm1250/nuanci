"use client";

import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
import { PixelStage } from "@/features/stage/pixel-stage";
import type { StageSpec } from "@/features/stage/types";
import { BlockButton, BlockLink, Panel } from "./block-ui";
import { ReactionFace } from "./reaction-face";
import type { Choice, Scene } from "./types";
import { SHARE_PARAM, takeEntry, track, uuid, type TrackEvent } from "./track";
import { useCopyLink, useReducedMotion, useSceneFlow } from "./use-scene-flow";

function Num({ n, dark = false }: { n: number; dark?: boolean }) {
  return <span className={`grid size-6 shrink-0 place-items-center font-pixel text-[15px] ${dark ? "bg-paper text-ink" : "bg-ink text-paper"}`}>{n}</span>;
}

function MineBadge() {
  return <span className="shrink-0 bg-gold px-1.5 py-1 font-pixel-title text-[12px] leading-none text-ink">내 선택</span>;
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className={`fill-current transition-transform ${open ? "rotate-90" : ""}`}>
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}

// 결과 목록의 한 줄. 대사와 상대 반응을 함께 보여주고, 지금 무대에 올린 줄은 어둡게 강조한다
function ResultBody({ choice, n, mine, active }: { choice: Choice; n: number; mine: boolean; active: boolean }) {
  return (
    <span className="flex items-start gap-3">
      <Num n={n} dark={active} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-[16px] font-semibold leading-snug">{choice.line}</span>
          {mine && <MineBadge />}
        </span>
        <span className={`mt-1.5 flex items-start gap-2 leading-snug ${active ? "text-[15px] font-semibold text-paper" : "text-[14px] text-ink-muted"}`}>
          <span className="mt-px">
            <ReactionFace expression={choice.expression} size={18} />
          </span>
          {choice.reaction}
        </span>
        {active && <span className="mt-2 block font-pixel text-[15px] text-gold">{choice.tags.join(" · ")}</span>}
      </span>
    </span>
  );
}

// 장면 하나를 처음 질문부터 오늘의 발견까지 진행하는 화면
export function ScenePlayer({ scene, nextNumber }: { scene: Scene; nextNumber: number }) {
  const [attemptId] = useState(uuid);
  const send = (e: Omit<TrackEvent, "sceneId" | "sceneVersion" | "attemptId">) =>
    track({ ...e, sceneId: scene.id, sceneVersion: scene.version, attemptId });
  const viewedSent = useRef(false);
  useEffect(() => {
    if (viewedSent.current) return;
    viewedSent.current = true;
    track({ type: "scene_viewed", sceneId: scene.id, sceneVersion: scene.version, attemptId, entry: takeEntry() });
  }, [scene.id, scene.version, attemptId]);

  const f = useSceneFlow(scene, send);
  const reduced = useReducedMotion();
  const { state: copyState, copy } = useCopyLink(`/scenes/${scene.number}?${SHARE_PARAM}=1`, () => send({ type: "share_link_copied" }));
  const [showMeaning, setShowMeaning] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const { situation, choice, pickedId, phase } = f;
  const later = phase !== "base";
  const stageSituation = later ? scene.followUp : scene.base;

  const spec = useMemo<StageSpec>(() => {
    const base = stageSituation.stage!;
    return { ...base, flags: [...(base.flags ?? []), ...(choice?.flags ?? [])] };
  }, [stageSituation, choice]);

  const scroller = useRef<HTMLElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [phase]);

  return (
    <div className="flex min-h-dvh justify-center bg-night-deep break-keep text-ink">
      <main className="relative flex h-dvh w-full max-w-[480px] flex-col bg-night">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4 font-pixel text-[15px]">
          <Link href="/" className="-ml-2 flex h-11 items-center px-2 text-gold">
            nuanci
          </Link>
          <p className="min-w-0 truncate text-paper">
            <span className="text-paper-subtle">장면 {scene.number}</span> {scene.title}
          </p>
        </header>

        <div className="shrink-0 px-4">
          <Panel>
            <div className="relative aspect-[4/3] max-h-[36dvh] w-full overflow-hidden">
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
                <p className="absolute bottom-2 left-2 animate-[fade-in_300ms] bg-ink px-2 py-1 font-pixel text-[15px] leading-none text-paper">
                  <span className="text-gold">만약에</span> {scene.followUp.to}
                </p>
              )}
              {phase === "transition" && !reduced && <div className="pointer-events-none absolute inset-0 animate-[wipe_520ms_ease-in-out_both] bg-ink" />}
            </div>
          </Panel>
        </div>

        <section ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5 [mask-image:linear-gradient(to_bottom,transparent,#000_20px)]">
          {phase === "transition" ? (
            <Panel key="transition" className="animate-[rise_220ms_ease-out]">
              <div className="p-5">
                <p className="font-pixel text-[15px] text-rust">만약에…</p>
                <p className="mt-1.5 font-pixel-title text-[24px] leading-[1.25]">{scene.followUp.prompt.replace(/^잠깐,\s*/, "")}</p>
                <p className="mt-3 text-[14px] text-ink-subtle">
                  <s>{scene.followUp.from}</s> → <span className="text-ink">{scene.followUp.to}</span>
                </p>
              </div>
            </Panel>
          ) : !choice ? (
            <div key={`ask-${phase}`}>
              <p className="text-[14px] leading-relaxed text-paper-muted">{situation.context}</p>
              <p className="mt-1.5 font-pixel-title text-[24px] leading-[1.25] text-paper">{situation.intent}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-pixel text-[15px] text-paper-subtle">뭐라고 말할까?</span>
                <button
                  type="button"
                  onClick={() => setShowMeaning((v) => !v)}
                  aria-pressed={showMeaning}
                  className="-mr-2 flex min-h-11 items-center px-2 font-pixel text-[15px] text-gold underline underline-offset-4"
                >
                  {showMeaning ? "뜻 숨기기" : "뜻 보기"}
                </button>
              </div>
              <ul className="mt-2 space-y-4">
                {situation.choices.map((c, i) => (
                  <li key={c.id}>
                    <BlockButton onClick={() => f.pick(c.id)} className="w-full text-left" faceClassName="flex items-center gap-3">
                      <Num n={i + 1} />
                      <span>
                        <span className="block text-[16px] font-semibold leading-snug">{c.line}</span>
                        {showMeaning && <span className="block text-[13px] text-ink-subtle">{c.meaning}</span>}
                      </span>
                    </BlockButton>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div key={`result-${phase}`}>
              {f.done && (
                <div className="mb-6 flex animate-[pop_320ms_ease-out] items-start gap-3">
                  <span className="blk-frame-sm mt-0.5 shrink-0">
                    <span className="blk block size-7 bg-gold shadow-[inset_4px_4px_0_#f4d27a,inset_-4px_-4px_0_#a87a1c]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-pixel text-[15px] text-gold">발견 블록을 얻었어요</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-paper">{scene.discovery}</p>
                  </div>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-pixel text-[15px] text-paper">이렇게 들려요</span>
                <span className="text-[13px] text-paper-subtle">다른 말도 눌러 보세요</span>
              </div>
              <ul className="mt-3 space-y-4">
                {situation.choices.map((c, i) => (
                  <li key={c.id} className="animate-[rise_240ms_ease-out_both]" style={{ animationDelay: `${i * 70}ms` }}>
                    {c.id === choice.id ? (
                      <Panel dark>
                        <div className="px-3 py-3" aria-current="true">
                          <ResultBody choice={c} n={i + 1} mine={c.id === pickedId} active />
                        </div>
                      </Panel>
                    ) : (
                      <BlockButton onClick={() => f.pick(c.id)} className="w-full text-left">
                        <ResultBody choice={c} n={i + 1} mine={c.id === pickedId} active={false} />
                      </BlockButton>
                    )}
                  </li>
                ))}
              </ul>
              <div key={choice.id} className="mt-6 animate-[fade-in_200ms]">
                <p className="font-pixel text-[15px] text-paper">왜 그렇게 들릴까?</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-paper-muted">{choice.why}</p>
                {detailOpen && <p className="mt-2 animate-[fade-in_150ms] text-[14px] leading-relaxed text-paper-muted">{choice.detail}</p>}
                <button
                  type="button"
                  onClick={() => setDetailOpen((v) => !v)}
                  aria-expanded={detailOpen}
                  className="-mx-1 flex min-h-11 items-center gap-2 px-1 font-pixel text-[15px] text-gold"
                >
                  <Caret open={detailOpen} />
                  {detailOpen ? "접기" : "더 자세히"}
                </button>
              </div>
            </div>
          )}
        </section>

        {(choice || phase === "transition") && (
          <footer className="shrink-0 border-t-[3px] border-night-deep px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            {phase === "transition" ? (
              <BlockButton gold onClick={f.enterFollowUp} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
                이번엔 뭐라고 할까?
              </BlockButton>
            ) : f.done ? (
              <div className="flex gap-3">
                <BlockButton onClick={copy} faceClassName="py-3.5 font-pixel text-[15px]">
                  {copyState === "copied" ? "복사됨" : copyState === "failed" ? "복사 실패" : "링크 복사"}
                </BlockButton>
                <BlockLink href={`/scenes/${nextNumber}`} entry="next" gold className="flex-1">
                  다음 장면
                </BlockLink>
              </div>
            ) : (
              <BlockButton gold onClick={f.startTransition} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
                상황 바꿔서 한 번 더
              </BlockButton>
            )}
          </footer>
        )}
      </main>
    </div>
  );
}
