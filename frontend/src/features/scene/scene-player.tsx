"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useEffect, useMemo, useRef, useState } from "react";
import { PixelStage } from "@/features/stage/pixel-stage";
import type { StageSpec } from "@/features/stage/types";
import { BlockButton, BlockLink, Panel } from "./block-ui";
import { shuffleChoices } from "./choice-order";
import { ReactionFace } from "./reaction-face";
import { sfx, toggleSound, useSoundEnabled } from "./sfx";
import type { Choice, ChoiceKind, Expression, Scene } from "./types";
import { markCleared, nextScene, useCleared } from "./progress";
import { markPlayed, SHARE_PARAM, takeEntry, track, uuid, type TrackEvent } from "./track";
import { useCopyLink, useReducedMotion, useSceneFlow } from "./use-scene-flow";

function Num({ n, dark = false }: { n: number; dark?: boolean }) {
  return <span className={`grid size-6 shrink-0 place-items-center font-pixel text-[15px] ${dark ? "bg-paper text-ink" : "bg-ink text-paper"}`}>{n}</span>;
}

function MineBadge({ dark }: { dark: boolean }) {
  return <span className={`shrink-0 px-1.5 py-1 font-pixel-title text-[12px] leading-none ${dark ? "bg-paper text-ink" : "bg-ink text-paper"}`}>내 선택</span>;
}

const KIND_LABELS: Record<ChoiceKind, string> = { literal: "직역", context: "맥락 주의", natural: "자연스러움" };

function KindChip({ kind }: { kind: ChoiceKind }) {
  return <span className="shrink-0 border-2 border-current px-1 py-0.5 font-pixel-title text-[12px] leading-none opacity-80">{KIND_LABELS[kind]}</span>;
}

// 상대 반응 위로 튀어나오는 만화 효과음 글자
const BURSTS: Record<Expression, { text: string; bad: boolean }> = {
  puzzled: { text: "엥?", bad: true },
  awkward: { text: "흠칫", bad: true },
  dizzy: { text: "털썩", bad: true },
  stuffed: { text: "끄억", bad: true },
  happy: { text: "오~", bad: false },
  delighted: { text: "꺄!", bad: false },
  neutral: { text: "…", bad: false },
};

// 고른 말의 판정. 채점처럼 O / △ / X로 보여주고 색만으로 구분하지 않게 기호를 함께 쓴다
const VERDICTS: Record<ChoiceKind, { label: string; color: string; glyph: string }> = {
  natural: { label: "자연스러워요", color: "bg-good", glyph: "M3 1h4v1h1v1h1v4H8v1H7v1H3V8H2V7H1V3h1V2h1zM3 3h4v4H3z" },
  context: { label: "맥락에 따라 어색해요", color: "bg-warn", glyph: "M4 1h2v2h1v2h1v2h1v2H1V7h1V5h1V3h1zM4 5h2v1h1v2H3V6h1z" },
  literal: { label: "직역이라 어색해요", color: "bg-bad", glyph: "M1 1h2v1h1v1h2V2h1V1h2v2H8v1H7v2h1v1h1v2H7V8H6V7H4v1H3v1H1V7h1V6h1V4H2V3H1z" },
};

function VerdictMark({ kind, pop = false }: { kind: ChoiceKind; pop?: boolean }) {
  const v = VERDICTS[kind];
  return (
    <span role="img" aria-label={v.label} className={`grid size-6 shrink-0 place-items-center ${v.color} ${pop ? "animate-[pop_320ms_ease-out_120ms_both]" : ""}`}>
      <svg width="16" height="16" viewBox="0 0 10 10" shapeRendering="crispEdges" fill="var(--color-ink)" aria-hidden>
        <path d={v.glyph} fillRule="evenodd" />
      </svg>
    </span>
  );
}

function SoundToggle() {
  const on = useSoundEnabled();
  return (
    <button type="button" onClick={toggleSound} aria-pressed={on} aria-label={on ? "소리 끄기" : "소리 켜기"} className="-mr-2 ml-auto grid size-11 shrink-0 place-items-center text-paper-muted hover:text-paper">
      <svg width="20" height="20" viewBox="0 0 10 10" shapeRendering="crispEdges" fill="currentColor" aria-hidden>
        <path d="M1 3h2v4H1zM3 3h1V2h1V1h1v8H5V8H4V7H3z" />
        {on ? <path d="M7 3h1v4H7zM8 2h1v1H8zM8 7h1v1H8zM9 3h1v4H9z" /> : <path d="M7 3h1v1H7zM9 3h1v1H9zM8 4h1v2H8zM7 6h1v1H7zM9 6h1v1H9z" />}
      </svg>
    </button>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className={`fill-current transition-transform ${open ? "rotate-90" : ""}`}>
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}

// 결과 목록의 한 줄. 대사와 상대 반응을 함께 보여주고, 지금 무대에 올린 줄은 어둡게 강조한다
// 아직 무대에서 들어 보지 않은 답은 반응을 가려 두고, 눌렀을 때 캐릭터 연출과 함께 보여준다
function HiddenReaction() {
  return (
    <span className="mt-1.5 flex items-center gap-2 text-[14px] leading-snug text-ink-subtle">
      <span className="grid size-[18px] shrink-0 place-items-center border-2 border-ink-subtle font-pixel text-[12px] leading-none">?</span>
      눌러서 반응 보기
    </span>
  );
}

function ResultBody({ choice, n, mine, active, showKind, revealed, verdictKey }: { choice: Choice; n: number; mine: boolean; active: boolean; showKind: boolean; revealed: boolean; verdictKey?: number }) {
  return (
    <span className="flex items-start gap-3">
      <Num n={n} dark={active} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-[16px] font-semibold leading-snug">{choice.line}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            {showKind && <KindChip kind={choice.kind} />}
            {mine && <MineBadge dark={active} />}
            {revealed && <VerdictMark key={verdictKey} kind={choice.kind} pop={active} />}
          </span>
        </span>
        {revealed ? (
          <span className={`mt-1.5 flex items-start gap-2 leading-snug ${active ? "text-[15px] font-semibold text-paper" : "text-[14px] text-ink-muted"}`}>
            <span className="mt-px">
              <ReactionFace expression={choice.expression} size={18} />
            </span>
            {choice.reaction}
          </span>
        ) : (
          <HiddenReaction />
        )}
        {active && <span className="mt-2 block font-pixel text-[15px] text-paper-muted">{choice.tags.join(" · ")}</span>}
      </span>
    </span>
  );
}

type PlayerProps = { scene: Scene; order?: { id: string; number: number }[]; preview?: boolean };

// Next.js는 떠난 페이지를 숨겨 두기만 해서 상태가 남는다. 링크로 새로 들어오면 처음부터, 뒤로 가기로 돌아오면 하던 곳부터 보여준다
export function ScenePlayer(props: PlayerProps) {
  const { bfcacheId } = useRouter();
  return <SceneRun key={bfcacheId} {...props} />;
}

// 장면 하나를 처음 질문부터 정리까지 진행하는 화면. 검수 미리보기에서는 이벤트를 보내지 않고 선택지 종류를 보여준다
function SceneRun({ scene: original, order = [], preview = false }: PlayerProps) {
  const scene = useMemo(() => shuffleChoices(original), [original]);
  const [attemptId] = useState(uuid);
  const send = (e: Omit<TrackEvent, "sceneId" | "sceneVersion" | "attemptId">) => {
    if (preview) return;
    if (e.type === "scene_completed") markCleared(scene.id);
    track({ ...e, sceneId: scene.id, sceneVersion: scene.version, attemptId });
  };
  const cleared = useCleared();
  const next = nextScene(order, cleared, scene.id);
  const viewedSent = useRef(false);
  useEffect(() => {
    if (preview || viewedSent.current) return;
    viewedSent.current = true;
    markPlayed();
    track({ type: "scene_viewed", sceneId: scene.id, sceneVersion: scene.version, attemptId, entry: takeEntry() });
  }, [scene.id, scene.version, attemptId, preview]);

  const f = useSceneFlow(scene, send);
  const reduced = useReducedMotion();
  const { state: copyState, copy } = useCopyLink(`/scenes/${scene.number}?${SHARE_PARAM}=1`, () => send({ type: "share_link_copied" }));
  const [showMeaning, setShowMeaning] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const { situation, choice, pickedId, seenIds, phase } = f;
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

  // 고른 말에 맞춰 소리를 내고, 마지막 선택이면 장면을 끝낸 팡파르를 붙인다
  const play = (c: Choice) => {
    if (c.id === choice?.id) return;
    sfx[c.kind === "natural" ? "good" : c.kind === "context" ? "meh" : "bad"]();
    if (phase === "followUp" && !pickedId) sfx.clear();
    f.pick(c.id);
  };

  const burst = choice ? BURSTS[choice.expression] : null;

  return (
    <div className="flex min-h-dvh justify-center bg-night-deep break-keep text-ink">
      <main className="relative flex h-dvh w-full max-w-[480px] flex-col bg-night md:grid md:max-w-[1080px] md:grid-cols-[minmax(0,1fr)_400px] md:grid-rows-[auto_minmax(0,1fr)_auto] md:gap-x-10 md:px-8">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4 font-pixel text-[15px] md:col-span-2 md:h-16 md:px-0">
          <Link href={preview ? `/admin/scenes/${scene.id}` : "/"} className="-ml-2 flex h-11 items-center px-2 text-gold">
            {preview ? "검수" : "nuanci"}
          </Link>
          <p className="min-w-0 truncate text-paper">{scene.title}</p>
          <SoundToggle />
        </header>

        <div className="shrink-0 px-4 md:row-span-2 md:px-0 md:pb-8">
          <Panel>
            <div className="relative aspect-[4/3] max-h-[36dvh] w-full overflow-hidden md:max-h-[calc(100dvh-8rem)]">
              <PixelStage
                spec={spec}
                reduced={reduced}
                state={{
                  meMotion: choice?.meMotion ?? stageSituation.meIdle?.motion,
                  meKey: f.reactionKey * 10 + (later ? 1 : 0),
                  meProp: choice?.meProp ?? stageSituation.meIdle?.prop,
                  partnerProp: choice?.partnerProp ?? stageSituation.partnerIdle.prop,
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
              {burst && !reduced && phase !== "transition" && (
                <span
                  key={`burst-${f.reactionKey}`}
                  aria-hidden
                  className={`pointer-events-none absolute right-[7%] top-[9%] animate-[burst_950ms_ease-out_70ms_both] font-pixel-title text-[24px] leading-none [text-shadow:2px_0_#fff,-2px_0_#fff,0_2px_#fff,0_-2px_#fff,2px_2px_#fff,-2px_-2px_#fff,2px_-2px_#fff,-2px_2px_#fff] ${burst.bad ? "text-rust" : "text-ink"}`}
                >
                  {burst.text}
                </span>
              )}

            </div>
          </Panel>
        </div>

        <section ref={scroller} className="scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-5 [mask-image:linear-gradient(to_bottom,transparent,#000_20px)] md:col-start-2 md:row-start-2 md:px-1 md:pt-0 md:[mask-image:none]">
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
              <p className="font-pixel text-[15px] leading-[1.6] text-paper-muted">{situation.context}</p>
              <p className="mt-1.5 font-pixel-title text-[24px] leading-[1.25] text-paper">{situation.intent}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-pixel text-[15px] text-paper-subtle">뭐라고 말할까?</span>
                <button
                  type="button"
                  onClick={() => setShowMeaning((v) => !v)}
                  aria-pressed={showMeaning}
                  className="-mr-2 flex min-h-11 items-center px-2 font-pixel text-[15px] text-paper-muted underline underline-offset-4"
                >
                  {showMeaning ? "뜻 숨기기" : "뜻 보기"}
                </button>
              </div>
              <ul className="mt-2 space-y-3">
                {situation.choices.map((c, i) => (
                  <li key={c.id}>
                    <BlockButton onClick={() => play(c)} className="w-full text-left" faceClassName="flex items-center gap-3">
                      <Num n={i + 1} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold leading-snug">{c.line}</span>
                        {showMeaning && <span className="block text-[13px] text-ink-subtle">{c.meaning}</span>}
                      </span>
                      {preview && (
                        <span className="text-ink-subtle">
                          <KindChip kind={c.kind} />
                        </span>
                      )}
                    </BlockButton>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div key={`result-${phase}`}>
              {f.done && (
                <div className="blk mb-8 animate-[rise_240ms_ease-out] bg-night-deep px-4 py-3">
                  <p className="font-pixel text-[15px] text-paper-subtle">한 줄 정리</p>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-paper">{scene.discovery}</p>
                </div>
              )}
              <p className="font-pixel text-[15px] text-paper-subtle">다른 말도 눌러 보세요</p>
              <ul className="mt-3 space-y-3">
                {situation.choices.map((c, i) => (
                  <li key={c.id} className="animate-[rise_240ms_ease-out_both]" style={{ animationDelay: `${i * 70}ms` }}>
                    {c.id === choice.id ? (
                      <Panel dark>
                        <div className="relative overflow-hidden px-3 py-3" aria-current="true">
                          {!reduced && (
                            <span
                              key={`glow-${f.reactionKey}`}
                              aria-hidden
                              className={`pointer-events-none absolute left-6 top-1/2 size-[640px] animate-[glow_700ms_ease-out_both] rounded-full ${VERDICTS[c.kind].color}`}
                            />
                          )}
                          <span className="relative block">
                            <ResultBody choice={c} n={i + 1} mine={c.id === pickedId} active showKind={preview} revealed verdictKey={f.reactionKey} />
                          </span>
                        </div>
                      </Panel>
                    ) : (
                      <BlockButton onClick={() => play(c)} className="w-full text-left">
                        <ResultBody choice={c} n={i + 1} mine={c.id === pickedId} active={false} showKind={preview} revealed={seenIds.includes(c.id)} />
                      </BlockButton>
                    )}
                  </li>
                ))}
              </ul>
              <div key={choice.id} className="mt-8 animate-[fade-in_200ms]">
                <p className="font-pixel text-[15px] text-paper">왜 그렇게 들릴까?</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-paper-muted">{choice.why}</p>
                {detailOpen && <p className="mt-2 animate-[fade-in_150ms] text-[14px] leading-relaxed text-paper-muted">{choice.detail}</p>}
                <button
                  type="button"
                  onClick={() => setDetailOpen((v) => !v)}
                  aria-expanded={detailOpen}
                  className="-mx-1 flex min-h-11 items-center gap-2 px-1 font-pixel text-[15px] text-paper-muted underline underline-offset-4"
                >
                  <Caret open={detailOpen} />
                  {detailOpen ? "접기" : "더 자세히"}
                </button>
              </div>
            </div>
          )}
        </section>

        {(choice || phase === "transition") && (
          <footer className="shrink-0 border-t-[3px] border-night-deep px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:col-start-2 md:row-start-3 md:px-1 md:pb-8">
            {phase === "transition" ? (
              <BlockButton gold onClick={f.enterFollowUp} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
                이번엔 뭐라고 할까?
              </BlockButton>
            ) : f.done && preview ? (
              <BlockLink href={`/admin/scenes/${scene.id}`}>편집 화면으로</BlockLink>
            ) : f.done ? (
              <div className="flex gap-3">
                <BlockButton onClick={copy} faceClassName="py-3.5 font-pixel text-[15px]">
                  {copyState === "copied" ? "복사됨" : copyState === "failed" ? "복사 실패" : "링크 복사"}
                </BlockButton>
                {next ? (
                  <BlockLink href={`/scenes/${next.number}`} entry="next" gold className="flex-1">
                    다음 장면
                  </BlockLink>
                ) : (
                  <BlockLink href="/" gold className="flex-1">
                    모두 해 봤어요
                  </BlockLink>
                )}
              </div>
            ) : (
              <BlockButton gold onClick={() => (sfx.whoosh(), f.startTransition())} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
                상황 바꿔서 한 번 더
              </BlockButton>
            )}
          </footer>
        )}
      </main>
    </div>
  );
}
