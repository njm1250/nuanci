"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useEffect, useMemo, useRef, useState } from "react";
import { bookEntry } from "@/features/collection/pairs";
import { Mascot } from "@/features/mascot/mascot";
// 장면 화면은 상대 대사가 무대 말풍선에만 있어서 무대를 늦게 불러오지 않는다
import { PixelStage as Stage } from "@/features/stage/pixel-stage";
import type { StageSpec } from "@/features/stage/types";
import { BlockButton, BlockLink, Panel } from "./block-ui";
import { shuffleChoices } from "./choice-order";
import { ReactionFace } from "./reaction-face";
import { sfx, toggleSound, useSoundEnabled } from "./sfx";
import { TRAP_LABELS, type Choice, type Expression, type Scene, type Verdict } from "./types";
import { markCleared, nextScene, useCleared } from "./progress";
import { markPlayed, SHARE_PARAM, takeEntry, track, uuid, type TrackEvent } from "./track";
import { useReducedMotion, useSceneFlow, useShare } from "./use-scene-flow";

function Num({ n, dark = false }: { n: number; dark?: boolean }) {
  return <span className={`grid size-6 shrink-0 place-items-center font-pixel text-[15px] ${dark ? "bg-paper text-ink" : "bg-ink text-paper"}`}>{n}</span>;
}

function MineBadge({ dark }: { dark: boolean }) {
  return <span className={`shrink-0 px-1.5 py-1 font-pixel-title text-[12px] leading-none ${dark ? "bg-paper text-ink" : "bg-ink text-paper"}`}>내 선택</span>;
}

// 검수 미리보기에서만 보이는 함정 유형 표시
function TrapChip({ choice }: { choice: Choice }) {
  return <span className="shrink-0 border-2 border-current px-1 py-0.5 font-pixel-title text-[12px] leading-none opacity-80">{choice.trap ? TRAP_LABELS[choice.trap] : "자연스러움"}</span>;
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
  love: { text: "두근", bad: false },
  angry: { text: "부들", bad: true },
  shocked: { text: "헉!", bad: true },
  sleepy: { text: "쿨…", bad: true },
  crying: { text: "흑흑", bad: true },
};

// 고른 말의 판정. 채점처럼 O / △ / X로 보여주고 색만으로 구분하지 않게 기호를 함께 쓴다
const VERDICTS: Record<Verdict, { label: string; color: string; glyph: string }> = {
  good: { label: "자연스러워요", color: "bg-good", glyph: "M3 1h4v1h1v1h1v4H8v1H7v1H3V8H2V7H1V3h1V2h1zM3 3h4v4H3z" },
  meh: { label: "상황에 따라 어색해요", color: "bg-warn", glyph: "M4 1h2v2h1v2h1v2h1v2H1V7h1V5h1V3h1zM4 5h2v1h1v2H3V6h1z" },
  bad: { label: "어색해요", color: "bg-bad", glyph: "M1 1h2v1h1v1h2V2h1V1h2v2H8v1H7v2h1v1h1v2H7V8H6V7H4v1H3v1H1V7h1V6h1V4H2V3H1z" },
};

function VerdictMark({ choice, pop = false }: { choice: Choice; pop?: boolean }) {
  const v = VERDICTS[choice.verdict];
  return (
    <span role="img" aria-label={choice.trap ? `${v.label} · ${TRAP_LABELS[choice.trap]}` : v.label} className={`grid size-6 shrink-0 place-items-center ${v.color} ${pop ? "animate-[stamp_260ms_ease-out_60ms_both]" : ""}`}>
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

// 표본이 적으면 비율이 들쭉날쭉해서 이만큼 모이기 전엔 보여주지 않는다
const MIN_PICKS = 20;

type StepPicks = { total: number; picks: Record<string, number> };
type PickStats = { base: StepPicks; followUp: StepPicks };

// 사람들이 첫 답으로 무엇을 골랐는지 불러온다. 실패하면 비율 없이 진행한다
function usePickStats(sceneId: string, preview: boolean) {
  const [stats, setStats] = useState<PickStats | null>(null);
  useEffect(() => {
    if (preview) return;
    let alive = true;
    fetch(`/api/scenes/${encodeURIComponent(sceneId)}/picks`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => alive && setStats(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [sceneId, preview]);
  return stats;
}

function ResultBody({
  choice,
  n,
  mine,
  active,
  showTrap,
  revealed,
  verdictKey,
  share,
}: {
  choice: Choice;
  n: number;
  mine: boolean;
  active: boolean;
  showTrap: boolean;
  revealed: boolean;
  verdictKey?: number;
  share?: number;
}) {
  return (
    <span className="flex items-start gap-3">
      <Num n={n} dark={active} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-[16px] font-semibold leading-snug">{choice.line}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            {showTrap && <TrapChip choice={choice} />}
            {mine && <MineBadge dark={active} />}
            {revealed && <VerdictMark key={verdictKey} choice={choice} pop={active} />}
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
        {active && <span className="mt-2 block text-[14px] leading-relaxed text-paper-muted">{choice.why}</span>}
        {revealed && share !== undefined && (
          <span className={`mt-1.5 block text-[13px] tabular-nums ${active ? "text-paper-muted" : "text-ink-subtle"}`}>첫 답으로 {share}%가 골랐어요</span>
        )}
      </span>
    </span>
  );
}

function Arrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="fill-current">
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}

// 장면을 끝낸 뒤의 완료 화면. 이번에 모은 표현을 먼저 크게 보여주고, 그다음 친구에게 문제 내기를 권한다
function WrapUp({ scene, share, shareState, onBack }: { scene: Scene; share: () => void; shareState: "idle" | "copied" | "failed"; onBack: () => void }) {
  const { pairs } = bookEntry(scene);
  return (
    <div className="animate-[rise_240ms_ease-out]">
      <div className="flex items-end gap-3">
        <Mascot scale={3} className="shrink-0" />
        <div className="pb-1">
          <p className="font-pixel text-[15px] text-gold">장면 완료!</p>
          <p className="mt-1 font-pixel-title text-[24px] leading-[1.25] text-paper">{scene.title}</p>
        </div>
      </div>
      <p className="mt-4 text-[14px] leading-relaxed text-paper">{scene.discovery}</p>

      <div className="blk-frame mt-5">
        <div className="blk bg-cream px-4 py-3 text-ink">
          <p className="font-pixel text-[15px]">
            표현 모음에 담았어요 <span className="text-ink-subtle">+{pairs.length}</span>
          </p>
          <ul className="mt-2 space-y-2.5">
            {pairs.map((p) => (
              <li key={p.right}>
                <p className="text-[16px] font-semibold leading-snug">{p.right}</p>
                <p className="text-[13px] text-ink-subtle">
                  {p.gist} · <s>{p.wrong}</s>
                </p>
              </li>
            ))}
          </ul>
          <Link href="/expressions" className="-mx-1 mt-1 flex min-h-11 items-center gap-2 px-1 font-pixel text-[15px] text-ink-muted underline underline-offset-4">
            전체 모음 보기
            <Arrow />
          </Link>
        </div>
      </div>

      <div className="blk mt-5 flex items-center gap-3 bg-slate-block px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[15px] text-paper">친구는 맞힐까?</p>
          <p className="text-[13px] text-paper-subtle">이 장면을 문제로 보내 보세요</p>
        </div>
        <BlockButton gold onClick={share} className="shrink-0" faceClassName="font-pixel text-[15px]">
          {shareState === "copied" ? "복사됨" : shareState === "failed" ? "복사 실패" : "문제 내기"}
        </BlockButton>
      </div>

      <button type="button" onClick={onBack} className="-mx-1 mt-4 flex min-h-11 items-center px-1 font-pixel text-[15px] text-paper-muted underline underline-offset-4">
        다른 말 다시 보기
      </button>
    </div>
  );
}

type PlayerProps = { scene: Scene; order?: { id: string; number: number }[]; preview?: boolean };

// Next.js는 떠난 페이지를 숨겨 두기만 해서 상태가 남는다. 링크로 새로 들어오면 처음부터, 뒤로 가기로 돌아오면 하던 곳부터 보여준다
export function ScenePlayer(props: PlayerProps) {
  const { bfcacheId } = useRouter();
  return <SceneRun key={bfcacheId} {...props} />;
}

// 장면 하나를 처음 질문부터 정리까지 진행하는 화면. 검수 미리보기에서는 이벤트를 보내지 않고 함정 유형을 보여준다
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
  const stats = usePickStats(scene.id, preview);
  const reduced = useReducedMotion();
  const { state: shareState, share } = useShare(`/scenes/${scene.number}?${SHARE_PARAM}=1`, `"${scene.title}" 너라면 영어로 뭐라고 할래?\n나는 풀어 봤어, 너도 맞혀 봐!`, () =>
    send({ type: "share_link_copied" }),
  );
  const [showMeaning, setShowMeaning] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [wrapped, setWrapped] = useState(false);
  const { situation, choice, pickedId, seenIds, phase } = f;
  const later = phase !== "base";
  // 완료 화면에서는 마지막에 고른 말 대신 자연스러운 말을 다시 들려주는 엔딩으로 끝낸다
  const stageChoice = wrapped ? (scene.followUp.choices.find((c) => c.verdict === "good") ?? choice) : choice;
  const stageKey = f.reactionKey * 10 + (later ? 1 : 0) + (wrapped ? 5 : 0);
  const stageSituation = later ? scene.followUp : scene.base;

  const spec = useMemo<StageSpec>(() => {
    const base = stageSituation.stage!;
    return { ...base, hero: scene.hero, flags: [...(base.flags ?? []), ...(stageChoice?.flags ?? [])] };
  }, [stageSituation, stageChoice, scene.hero]);

  const scroller = useRef<HTMLElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [phase, wrapped]);

  // X일 때만 무대 칸을 짧게 흔든다. 화면 전체가 아니라 무대만 흔들어서 틀렸다는 신호로만 쓴다
  const stageBox = useRef<HTMLDivElement>(null);
  const shake = () => {
    if (reduced) return;
    stageBox.current?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }],
      { duration: 280, delay: 60, easing: "ease-out" },
    );
  };

  // 고른 말에 맞춰 소리를 낸다
  const play = (c: Choice) => {
    if (c.id === choice?.id) return;
    sfx[c.verdict]();
    if (c.verdict === "bad") shake();
    f.pick(c.id);
  };

  // 비교를 다 본 뒤에 완료 화면으로 넘어가며 팡파르를 울린다. 처음 한 번만 울린다
  const fanfared = useRef(false);
  const wrapUp = () => {
    if (!fanfared.current) {
      sfx.clear();
      send({ type: "wrap_viewed" });
    }
    fanfared.current = true;
    setWrapped(true);
  };

  const burst = stageChoice ? BURSTS[stageChoice.expression] : null;
  const stepPicks = stats?.[later ? "followUp" : "base"];
  const shareOf = (c: Choice) => (stepPicks && stepPicks.total >= MIN_PICKS ? Math.round(((stepPicks.picks[c.id] ?? 0) / stepPicks.total) * 100) : undefined);

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

        <div ref={stageBox} className="shrink-0 px-4 md:row-span-2 md:px-0 md:pb-8">
          <Panel>
            <div className="relative aspect-[4/3] max-h-[36dvh] w-full overflow-hidden md:max-h-[calc(100dvh-8rem)]">
              <Stage
                spec={spec}
                reduced={reduced}
                state={{
                  meMotion: stageChoice?.meMotion ?? stageSituation.meIdle?.motion,
                  meKey: stageKey,
                  meProp: stageChoice?.meProp ?? stageSituation.meIdle?.prop,
                  partnerProp: stageChoice?.partnerProp ?? stageSituation.partnerIdle.prop,
                  partnerMotion: stageChoice?.motion ?? stageSituation.partnerIdle.motion,
                  partnerKey: stageKey,
                  talkKey: stageKey,
                  reaction: stageChoice?.expression ?? null,
                  meLine: stageChoice?.line,
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
                  key={`burst-${stageKey}`}
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
          ) : wrapped ? (
            <WrapUp key="wrap" scene={scene} share={share} shareState={shareState} onBack={() => setWrapped(false)} />
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
                          <TrapChip choice={c} />
                        </span>
                      )}
                    </BlockButton>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div key={`result-${phase}`}>
              <p className="font-pixel text-[15px] text-paper-subtle">다른 말도 눌러 보세요</p>
              <ul className="mt-3 space-y-3">
                {situation.choices.map((c, i) => (
                  <li key={c.id} className="animate-[rise_240ms_ease-out_both]" style={{ animationDelay: `${i * 70}ms` }}>
                    {c.id === choice.id ? (
                      <Panel dark>
                        <div className="relative overflow-hidden px-3 py-3" aria-current="true">
                          {!reduced && (
                            <span key={`tint-${f.reactionKey}`} aria-hidden className={`pointer-events-none absolute inset-0 animate-[tint_400ms_ease-out_both] ${VERDICTS[c.verdict].color}`} />
                          )}
                          <span className="relative block">
                            <ResultBody choice={c} n={i + 1} mine={c.id === pickedId} active showTrap={preview} revealed verdictKey={f.reactionKey} share={shareOf(c)} />
                            <span className="block pl-9">
                              {detailOpen && <span className="mt-2 block animate-[fade-in_150ms] text-[14px] leading-relaxed text-paper-muted">{c.detail}</span>}
                              <button
                                type="button"
                                onClick={() => setDetailOpen((v) => !v)}
                                aria-expanded={detailOpen}
                                className="-mx-1 -mb-2 flex min-h-11 items-center gap-2 px-1 font-pixel text-[15px] text-paper-muted underline underline-offset-4"
                              >
                                <Caret open={detailOpen} />
                                {detailOpen ? "접기" : "더 자세히"}
                              </button>
                            </span>
                          </span>
                        </div>
                      </Panel>
                    ) : (
                      <BlockButton onClick={() => play(c)} className="w-full text-left">
                        <ResultBody choice={c} n={i + 1} mine={c.id === pickedId} active={false} showTrap={preview} revealed={seenIds.includes(c.id)} share={shareOf(c)} />
                      </BlockButton>
                    )}
                  </li>
                ))}
              </ul>
              {f.done && preview && (
                <div className="blk mt-6 bg-night-deep px-4 py-3">
                  <p className="font-pixel text-[15px] text-paper-subtle">한 줄 정리</p>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-paper">{scene.discovery}</p>
                </div>
              )}
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
            ) : f.done && !wrapped ? (
              <BlockButton gold onClick={wrapUp} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
                다 봤어요
              </BlockButton>
            ) : f.done ? (
              next ? (
                <BlockLink href={`/scenes/${next.number}`} entry="next" gold onClick={() => send({ type: "next_clicked" })}>
                  다음 장면
                </BlockLink>
              ) : (
                <BlockLink href="/" gold>
                  모두 해 봤어요
                </BlockLink>
              )
            ) : (
              <BlockButton gold onClick={() => (sfx.whoosh(), f.startTransition())} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
                만약에 상황이 바뀐다면?
              </BlockButton>
            )}
          </footer>
        )}
      </main>
    </div>
  );
}
