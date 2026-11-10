"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useEffect, useMemo, useRef, useState } from "react";
import { logoSvg, wordmarkSvg } from "@/features/site/logo";
import { useHeroLook } from "@/features/rewards/hero-look";
import { COLOR_HEX, isUnopened, usePendingRewards, useRewards } from "@/features/rewards/rewards";
import { playStreak, useStreakMoment } from "@/features/streak/streak";
// 장면 화면은 상대 대사가 무대 말풍선에만 있어서 three.js를 이 파일을 읽자마자 받기 시작한다.
// 다만 페이지 묶음에는 넣지 않아서, 받는 동안에도 글자와 선택지는 먼저 그려지고 누를 수 있다
import { preloadStage, Stage } from "@/features/stage/stage";
import type { AccessoryId, StageSpec, Worn } from "@/features/stage/types";
import { BlockButton, BlockLink, Panel } from "./block-ui";
import { shuffleChoices } from "./choice-order";
import { BEAT_AT, MochiCameo, PUNCH_AT, PUNCH_HOLD, Subtitle, type EndingStep } from "./ending";
import { ImagineBubble } from "./imagine-bubble";
import { primeAudio, sfx } from "./sfx";
import { useTranslationOn } from "./translation";
import { type Beat, type Choice, type Scene } from "./types";
import { Num, VERDICTS } from "./verdict";
import { markCleared, nextScene } from "./progress";
import { markPlayed, SHARE_PARAM, takeEntry, track, uuid, watchEngagement, type TrackEvent } from "./track";
import { useReducedMotion, useSceneFlow, useShare } from "./use-scene-flow";
import { TrapChip, BURSTS, SoundToggle, Question, MochiAsk, Caret, MIN_PICKS, usePickStats, ResultBody, PickMeta } from "./scene-parts";
import { REACT_AFTER, REACT_AFTER_IMAGINE, STREAK_DELAY, AFTER_STREAK, PRIZE_MS, stagePrize, PrizeNote, WrapUp } from "./wrap-up";
import { beatMs, BeatDots, BeatLog, LeadRecap } from "./beat-log";

preloadStage();


// teaser는 다음 장면 예고. 페이지가 서버에서 만들어 넘겨서 브라우저가 다음 장면 본문을 받지 않는다
type PlayerProps = { scene: Scene; order?: { id: string; number: number }[]; teaser?: string | null; preview?: boolean };

// Next.js는 떠난 페이지를 숨겨 두기만 해서 상태가 남는다. 링크로 새로 들어오면 처음부터, 뒤로 가기로 돌아오면 하던 곳부터 보여준다
export function ScenePlayer(props: PlayerProps) {
  const { bfcacheId } = useRouter();
  return <SceneRun key={bfcacheId} {...props} />;
}

// 장면 하나를 처음 질문부터 정리까지 진행하는 화면. 검수 미리보기에서는 이벤트를 보내지 않고 함정 유형을 보여준다
function SceneRun({ scene: original, order = [], teaser = null, preview = false }: PlayerProps) {
  const scene = useMemo(() => shuffleChoices(original), [original]);
  const [attemptId] = useState(uuid);
  const send = (e: Omit<TrackEvent, "sceneId" | "sceneVersion" | "attemptId">) => {
    if (preview) return;
    if (e.type === "scene_completed") {
      markCleared(scene.id);
      void playStreak(scene.id);
    }
    track({ ...e, sceneId: scene.id, sceneVersion: scene.version, attemptId });
  };
  const next = nextScene(order, scene.id);
  const viewedSent = useRef(false);
  useEffect(() => {
    if (preview || viewedSent.current) return;
    viewedSent.current = true;
    markPlayed();
    track({ type: "scene_viewed", sceneId: scene.id, sceneVersion: scene.version, attemptId, entry: takeEntry() });
  }, [scene.id, scene.version, attemptId, preview]);
  useEffect(() => (preview ? undefined : watchEngagement({ sceneId: scene.id, sceneVersion: scene.version, attemptId })), [scene.id, scene.version, attemptId, preview]);

  useEffect(primeAudio, []);

  const f = useSceneFlow(scene, send);
  const look = useHeroLook();
  const rewards = useRewards();
  const granted = usePendingRewards(scene.id);
  const streakMoment = useStreakMoment(scene.id);
  const stats = usePickStats(scene.id, preview);
  const reduced = useReducedMotion();
  const translate = useTranslationOn();
  const { state: shareState, share } = useShare(`/scenes/${scene.number}?${SHARE_PARAM}=${rewards?.shareCode ?? 1}`, `"${scene.title}" 너라면 영어로 뭐라고 할래?\n나는 풀어 봤어, 너도 맞혀 봐!`, () =>
    send({ type: "share_link_copied" }),
  );
  const [showMeaning, setShowMeaning] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [wrapped, setWrapped] = useState(false);
  const { situation, choice, pickedId, seenIds, phase } = f;
  const later = phase !== "base";
  // 완료 화면에서는 마지막에 고른 말 대신 자연스러운 말을 다시 들려준다
  const stageChoice = wrapped ? (scene.followUp.choices.find((c) => c.verdict === "good") ?? choice) : choice;
  const stageSituation = later ? scene.followUp : scene.base;

  // 질문 전에 대사(빌드업·이음)가 있으면 무대에서 한 줄씩 흘려보낸 뒤 질문을 띄운다
  const step = later ? "followUp" : "base";
  // 이어지는 장면에서 첫 질문을 틀린 말로 끝냈으면, 이음 대사 앞에 내가 자연스러운 말로 다시 말하는 줄을 넣어 이야기가 모순되지 않게 한다
  const [recover, setRecover] = useState<Beat | null>(null);
  const lead = step === "followUp" && recover ? [recover, ...(situation.lead ?? [])] : (situation.lead ?? []);
  const [leadAt, setLeadAt] = useState({ base: 0, followUp: 0 });
  const leadIdx = leadAt[step];
  // 영어와 번역을 천천히 읽고 싶은 사람은 자동 넘김을 멈추고 직접 넘길 수 있다
  const [autoPaused, setAutoPaused] = useState(false);
  const leading = phase !== "transition" && !wrapped && leadIdx < lead.length;
  const beat = leading ? lead[leadIdx] : null;
  const played = phase === "transition" ? [] : lead.slice(0, leading ? leadIdx + 1 : lead.length);
  const leadFlags = played.flatMap((b) => b.flags ?? []).join(",");
  // 소품은 대사가 흐르는 동안 마지막으로 든 것을 계속 들고 있는다
  const heldMe = leading ? played.findLast((b) => b.who === "me" && b.prop)?.prop : undefined;
  const heldPartner = leading ? played.findLast((b) => b.who === "partner" && b.prop)?.prop : undefined;
  // 대사가 끝날 때 끝까지 봤는지(저절로 흐르거나 눌러 넘김) 건너뛰었는지 한 번 남긴다. 대사 도중에 나가는지 보려는 것이다
  const lastBeat = leadIdx + 1 >= lead.length;
  const nextBeat = () => {
    if (lastBeat) send({ type: "lead_finished", step, choiceId: "watched" });
    setLeadAt((a) => ({ ...a, [step]: a[step] + 1 }));
  };
  const skipLead = () => {
    send({ type: "lead_finished", step, choiceId: "skipped" });
    setLeadAt((a) => ({ ...a, [step]: lead.length }));
  };
  useEffect(() => {
    if (beat) sfx.blip(beat.line === "……" ? "narration" : beat.who);
  }, [beat]);
  // 다른 탭이나 앱으로 가 있는 동안 대사가 혼자 넘어가면 돌아와서 이야기를 놓친다. 떠나는 순간 자동 넘김을 멈춘다
  useEffect(() => {
    if (!leading) return;
    const onHide = () => document.hidden && setAutoPaused(true);
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [leading]);
  useEffect(() => {
    if (!beat || autoPaused) return;
    const t = window.setTimeout(() => {
      if (lastBeat && !preview) track({ type: "lead_finished", sceneId: scene.id, sceneVersion: scene.version, attemptId, step, choiceId: "watched" });
      setLeadAt((a) => ({ ...a, [step]: a[step] + 1 }));
    }, beatMs(beat));
    return () => clearTimeout(t);
  }, [beat, autoPaused, step, lastBeat, preview, scene.id, scene.version, attemptId]);
  // 데스크톱에서는 키보드로도 넘긴다. 버튼에 포커스가 있으면 버튼이 받으니 한 번에 두 줄 넘어가지 않게 비켜 준다
  useEffect(() => {
    if (!leading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !["Enter", " ", "ArrowRight"].includes(e.key)) return;
      if (e.target instanceof Element && e.target.closest("button, a, input, textarea")) return;
      e.preventDefault();
      nextBeat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 이어지는 장면(time)은 "만약에" 카드 없이 시간 자막만 잠깐 보여주고 바로 넘어간다
  const timeCue = scene.followUp.time;
  const { enterFollowUp } = f;
  useEffect(() => {
    if (phase !== "transition" || !timeCue) return;
    const t = window.setTimeout(enterFollowUp, reduced ? 300 : 1100);
    return () => clearTimeout(t);
  }, [phase, timeCue, reduced, enterFollowUp]);

  // 완료 화면에서 자연스러운 말을 다시 들려준 뒤 엔딩 컷(한 박자 쉬기 → 펀치라인)을 재생한다
  const ending = scene.ending;
  const [endingStep, setEndingStep] = useState<EndingStep>("off");
  const punch = () => {
    setEndingStep("punch");
    sfx.punch();
  };
  useEffect(() => {
    if (!wrapped || !ending || endingStep === "punch") return;
    const beat = endingStep === "off";
    const t = window.setTimeout(beat ? () => setEndingStep("beat") : punch, reduced ? 0 : beat ? BEAT_AT : PUNCH_AT - BEAT_AT);
    return () => clearTimeout(t);
  }, [wrapped, ending, endingStep, reduced]);
  const endingOn = wrapped && ending !== undefined && endingStep !== "off";
  const partnerEnds = endingOn && ending.who === "partner";
  const stageKey = f.reactionKey * 100 + (endingOn ? (endingStep === "beat" ? 10 : 20) : 0) + (beat ? 40 + leadIdx * 2 : 0) + (later ? 1 : 0) + (wrapped ? 5 : 0);
  // 고른 뒤 상대 말풍선을 질문에서 상대 반응으로 바꿔, 판정만이 아니라 "그래서 상대가 뭐래?"까지 무대에서 이어진다.
  // 생각 말풍선(imagine)이 있으면 그게 사라진 뒤에 바꾼다. 같은 자리 근처라 겹치면 둘 다 안 읽힌다
  const [reactedKey, setReactedKey] = useState<number | null>(null);
  const reactWait = !stageChoice || endingOn || beat || wrapped ? null : stageChoice.imagine ? (reduced ? null : REACT_AFTER_IMAGINE) : reduced ? 0 : REACT_AFTER;
  useEffect(() => {
    if (reactWait === null) return;
    const t = window.setTimeout(() => setReactedKey(stageKey), reactWait);
    return () => clearTimeout(t);
  }, [stageKey, reactWait]);
  const partnerReacts = reactWait !== null && reactedKey === stageKey;

  // 팡파르(와 연속 기록 줄)가 끝나고 새 물건 카드가 들어올 때 주인공도 무대에서 그 물건을 받는다. 잠깐 보여준 뒤 엔딩으로 돌아간다
  const prize = stagePrize(granted);
  const [prizeStep, setPrizeStep] = useState<"wait" | "on" | "off">("wait");
  const prizeId = prize?.id;
  // 엔딩 컷이 있으면 펀치라인을 읽고 난 뒤에 새 물건이 들어온다
  const rewardAt = Math.max(STREAK_DELAY + (streakMoment ? AFTER_STREAK : 0), ending && !reduced ? PUNCH_AT + PUNCH_HOLD : 0);
  useEffect(() => {
    if (!wrapped || !prizeId || prizeStep === "off") return;
    const t = window.setTimeout(() => setPrizeStep(prizeStep === "wait" ? "on" : "off"), prizeStep === "wait" ? rewardAt : PRIZE_MS);
    return () => clearTimeout(t);
  }, [wrapped, prizeId, prizeStep, rewardAt]);
  const prizeOn = wrapped && prize !== null && prizeStep === "on";
  // 새로 받은 쓰는 아이템은 받는 순간 무대에서 미리 써 본다. 같은 자리(머리·얼굴·목)에 쓰던 것은 잠깐 벗는다
  const tryOn = prizeOn && prize.kind === "wear" && !isUnopened(prize) ? prize : null;
  const shownWear: Worn[] = tryOn
    ? [
        ...look.wear.filter((w) => rewards?.items.find((i) => i.id === w.id)?.slot !== tryOn.slot),
        { id: tryOn.id as AccessoryId, color: tryOn.owned?.color ? COLOR_HEX[tryOn.owned.color] : undefined },
      ]
    : look.wear;

  // 쓰고 있는 아이템 목록은 렌더마다 새로 만들어져서, 내용이 바뀔 때만 무대를 다시 계산하도록 문자열로 비교한다
  const wearKey = JSON.stringify(shownWear);
  const spec = useMemo<StageSpec>(() => {
    const base = stageSituation.stage!;
    // 주인공은 아지트에서 고른 모습으로 나온다. 아이템은 겉모습만 바꾼다
    return { ...base, hero: look.hero, wear: JSON.parse(wearKey), flags: [...(base.flags ?? []), ...(stageChoice?.flags ?? []), ...(leadFlags ? leadFlags.split(",") : [])] };
  }, [stageSituation, stageChoice, look.hero, wearKey, leadFlags]);

  const scroller = useRef<HTMLElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [phase, wrapped]);
  // 고른 답의 카드가 하단 버튼에 가려 잘려 보이지 않게, 고를 때마다 그 카드를 보이는 자리로 올린다
  const choiceId = choice?.id;
  useEffect(() => {
    if (!choiceId) return;
    const card = scroller.current?.querySelector<HTMLElement>("[aria-current]");
    card?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [choiceId, reduced]);

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

  // 메뉴처럼 숫자 키 1·2·3으로도 보기를 고른다. 보기가 보이는 동안(질문과 결과 비교)만 받는다
  const choosing = !leading && !wrapped && phase !== "transition";
  useEffect(() => {
    if (!choosing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest("input, textarea, select, dialog")) return;
      const c = situation.choices[Number(e.key) - 1];
      if (!c) return;
      e.preventDefault();
      play(c);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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

  // 새 아이템을 써 보면 주인공이 손뼉을 친다
  const celebrate = wrapped && granted.some((i) => i.kind === "wear" && look.isWorn(i.id));
  // 새로 얻은 물건을 계속 쓰거나 둔 채로 다음 장면에 가는지 지표로 남긴다
  const keptNew = granted.filter((i) => (i.kind === "wear" ? look.isWorn(i.id) : look.placed.includes(i.id)));
  // 펀치라인이 나오기 전에 다음 장면을 누르면 첫 탭은 엔딩을 바로 보여 주고, 다음 탭에 넘어간다
  const holdForEnding = (e: React.MouseEvent) => {
    if (!wrapped || !ending || endingStep === "punch") return false;
    e.preventDefault();
    punch();
    return true;
  };
  const goNext = (e: React.MouseEvent) => {
    if (holdForEnding(e)) return;
    send({ type: "next_clicked" });
    keptNew.forEach((i) => send({ type: "reward_equipped", choiceId: i.id }));
  };

  const burst = stageChoice && !endingOn ? BURSTS[stageChoice.expression] : null;
  const stepPicks = stats?.[later ? "followUp" : "base"];
  const shareOf = (c: Choice) => (stepPicks && stepPicks.total >= MIN_PICKS ? Math.round(((stepPicks.picks[c.id] ?? 0) / stepPicks.total) * 100) : undefined);

  return (
    <div className="flex min-h-dvh justify-center overflow-x-clip bg-page break-keep text-ink">
      {/* 데스크톱은 전체 높이를 820px까지 쓰고 세로 가운데에 둔다. 오른쪽 선택 영역이 무대 높이에 묶이지 않아 보기와 결과 카드가 잘리지 않는다 */}
      <main className="relative flex h-dvh w-full max-w-[480px] flex-col bg-page md:grid md:max-w-[1200px] md:grid-cols-[minmax(0,1fr)_minmax(480px,1.1fr)] lg:max-w-[1360px] lg:grid-cols-[minmax(0,1.3fr)_minmax(440px,1fr)] md:grid-rows-[auto_minmax(0,max-content)] md:content-start md:gap-x-10 md:px-8">
        {/* 모바일은 머리줄과 무대를 검은 띠로 묶고, 데스크톱은 다른 화면처럼 머리줄만 화면 너비로 검게 둔다 */}
        <div className="shrink-0 md:contents">
        <header className="relative isolate flex h-14 shrink-0 items-center gap-2 bg-ink px-4 font-label text-ui text-fg md:col-span-2 md:h-16 md:bg-transparent md:px-0 md:before:absolute md:before:inset-y-0 md:before:left-1/2 md:before:-z-10 md:before:w-screen md:before:-translate-x-1/2 md:before:bg-ink">
          <Link href={preview ? `/admin/scenes/${scene.id}` : "/"} aria-label={preview ? undefined : "nuanci"} className="-ml-2 flex h-11 shrink-0 items-center gap-1.5 px-2">
            {/* 다른 화면 머리줄과 같은 마크+글자 로고. 제목 자리가 좁아서 조금 작게 둔다 */}
            {preview ? (
              <span className="logo">검수</span>
            ) : (
              <>
                <span aria-hidden className="block size-6 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: logoSvg() }} />
                <span aria-hidden className="block h-[18px] w-[67px] [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: wordmarkSvg() }} />
              </>
            )}
          </Link>
          <h1 className="min-w-0 truncate text-fg">{scene.title}</h1>
          {/* 선택지 위 한 줄을 아끼려고 뜻 보기는 머리줄에 둔다. 고르는 동안에만 보인다 */}
          <div className="ml-auto flex shrink-0 items-center">
            {!choice && !wrapped && !leading && phase !== "transition" && (
              <button type="button" onClick={() => setShowMeaning((v) => !v)} aria-pressed={showMeaning} className="flex min-h-11 items-center px-2">
                <span className={`border-2 px-1.5 py-1 text-note leading-none ${showMeaning ? "border-fg bg-fg text-page" : "border-fg-subtle text-fg-muted"}`}>{showMeaning ? "뜻 숨기기" : "뜻 보기"}</span>
              </button>
            )}
            <SoundToggle />
          </div>
        </header>

        <div ref={stageBox} onClick={leading ? nextBeat : undefined} className="shrink-0 bg-ink md:self-start md:bg-transparent md:pb-8 md:pt-6">
          <Panel>
            <div className="relative aspect-[4/3] max-h-[36dvh] w-full overflow-hidden md:max-h-[calc(100dvh-10rem)]">
              <Stage
                spec={spec}
                reduced={reduced}
                state={{
                  meMotion: prizeOn ? "bounce" : celebrate ? "clap" : beat?.who === "me" && beat.motion ? beat.motion : (stageChoice?.meMotion ?? stageSituation.meIdle?.motion),
                  meKey: prizeOn ? stageKey + 1000 : stageKey,
                  // 방에 둘 물건과 상자는 선물 상자를 들고 받는다
                  meProp: prizeOn && !tryOn ? "gift" : (heldMe ?? stageChoice?.meProp ?? stageSituation.meIdle?.prop),
                  meNote: prizeOn ? <PrizeNote item={prize} /> : undefined,
                  meNoteKey: prize?.id,
                  partnerProp: heldPartner ?? stageChoice?.partnerProp ?? stageSituation.partnerIdle.prop,
                  partnerMotion: beat
                    ? beat.who === "partner" && beat.motion
                      ? beat.motion
                      : stageSituation.partnerIdle.motion
                    : endingOn ? (partnerEnds && endingStep === "punch" ? (ending.motion ?? "idle") : "idle") : (stageChoice?.motion ?? stageSituation.partnerIdle.motion),
                  partnerKey: stageKey,
                  talkKey: stageKey,
                  reaction: endingOn ? null : (stageChoice?.expression ?? null),
                  meLine: beat ? (beat.who === "me" ? beat.line : undefined) : endingOn ? undefined : stageChoice?.line,
                  partnerLine: beat
                    ? beat.who === "partner"
                      ? beat.line
                      : undefined
                    : endingOn
                      ? partnerEnds
                        ? endingStep === "beat"
                          ? "……"
                          : ending.line
                        : undefined
                      : // 이음 대사가 있는 장면은 전환 중에 다음 질문을 미리 띄우지 않는다
                        phase === "transition" && scene.followUp.lead?.length
                        ? undefined
                        : stageSituation.partnerLine,
                  partnerSays: partnerReacts ? stageChoice?.reaction : undefined,
                  meTurn: phase !== "transition" && !choice && !beat,
                }}
              />
              {beat?.who === "mochi" && <MochiCameo step="punch" line={beat.line} />}
              {beat && <BeatDots total={lead.length} at={leadIdx} />}
              {endingOn && ending.who === "mochi" && <MochiCameo step={endingStep} line={ending.line} />}
              {endingOn && endingStep === "punch" && translate && <Subtitle text={ending.meaning} />}
              {later && !endingOn && !beat && (
                <p className="absolute bottom-2 left-2 animate-fade bg-ink px-2 py-1 font-label text-ui leading-none text-fg">
                  {timeCue ?? (
                    <>
                      <span className="font-bold">만약에</span> {scene.followUp.to}
                    </>
                  )}
                </p>
              )}
              {phase === "transition" && !reduced && <div className="pointer-events-none absolute inset-0 animate-wipe bg-ink" />}
              {burst && !reduced && phase !== "transition" && (
                <span
                  key={`burst-${stageKey}`}
                  aria-hidden
                  className={`pointer-events-none absolute right-[7%] top-[9%] animate-burst font-poster text-display-sm leading-none text-outline-white ${burst.bad ? "text-rust" : "text-ink"}`}
                >
                  {burst.text}
                </span>
              )}
              {stageChoice?.imagine && !wrapped && phase !== "transition" && (
                <ImagineBubble key={`imagine-${stageKey}`} icon={stageChoice.imagine.icon} caption={stageChoice.imagine.caption} reduced={reduced} />
              )}
            </div>
          </Panel>
        </div>
        </div>

        {/* 데스크톱 오른쪽 칸은 내용만큼만 길어지고, 짧으면 버튼을 무대 아래 끝선에 맞춘다. 화면보다 길어질 때만 글 영역이 스크롤된다 */}
        <div className="contents md:col-start-2 md:row-start-2 md:flex md:min-h-0 md:flex-col">
        {/* 데스크톱에서는 오른쪽 패널만 따로 스크롤된다. 위아래 끝을 흐리게 해서 더 있다는 걸 보여 주고, 스크롤바 자리를 미리 비워 글이 옆으로 밀리지 않게 한다 */}
        <section ref={scroller} className="scroll-area min-h-0 flex-1 md:px-1 md:pt-6 md:[mask-image:linear-gradient(to_bottom,#000_calc(100%-32px),transparent)] overflow-y-auto overflow-x-hidden px-4 pb-8 pt-5 [mask-image:linear-gradient(to_bottom,transparent,#000_20px,#000_calc(100%-24px),transparent)] md:flex-initial">
          {phase === "transition" && timeCue ? (
            <p key="time" className="animate-rise pt-6 text-center font-poster text-display-sm text-fg">
              {timeCue}…
            </p>
          ) : phase === "transition" ? (
            <Panel key="transition" className="animate-rise">
              <div className="p-5">
                <p className="font-label text-ui text-rust">만약에…</p>
                <p className="mt-1.5 text-say font-semibold leading-snug">{scene.followUp.prompt.replace(/^잠깐,\s*/, "")}</p>
                <p className="mt-3 text-note text-ink-subtle">
                  <s className="decoration-rust decoration-2">{scene.followUp.from}</s> → <span className="text-ink">{scene.followUp.to}</span>
                </p>
              </div>
            </Panel>
          ) : wrapped ? (
            <WrapUp
              key="wrap"
              scene={scene}
              share={share}
              shareState={shareState}
              onBack={() => {
                setWrapped(false);
                setEndingStep("off");
              }}
              granted={granted}
              reduced={reduced}
              onRewardShown={(ids) => ids.forEach((id) => send({ type: "reward_shown", choiceId: id }))}
              streak={streakMoment}
              rewardAt={rewardAt}
            />
          ) : leading ? (
            <div key={`lead-${phase}`}>
              <p className="mb-3 text-note leading-normal text-fg-muted">{situation.context}</p>
              <BeatLog beats={lead.slice(0, leadIdx + 1)} partnerName={scene.partnerName} translate={translate} />
            </div>
          ) : !choice ? (
            // 상대가 한 말을 먼저 띄우고 선택지는 조금 늦게 올려서, 탭을 늘리지 않고도 눈이 질문 → 선택지 순서로 가게 한다.
            // 고르는 동안 질문이 계속 보이고, 작은 폰(375×667)에서도 선택지 세 개가 스크롤 없이 들어오게 높이를 맞춘다
            <div key={`ask-${phase}`}>
              <p className="text-note leading-normal text-fg-muted">{situation.context}</p>
              {lead.length > 0 && <LeadRecap beats={lead} partnerName={scene.partnerName} translate={translate} />}
              <Question name={scene.partnerName} line={situation.partnerLine} intent={situation.intent} className="mt-2.5 animate-rise" />
              {/* 대사를 영상처럼 보던 사람도 지금 고를 차례라는 걸 알게, 메뉴처럼 Mochi가 말풍선으로 묻는다 */}
              <MochiAsk className="mt-3 animate-rise [animation-delay:200ms]">너라면 뭐라고 할래?</MochiAsk>
              <ul className="mt-2 space-y-2.5">
                {situation.choices.map((c, i) => (
                  <li key={c.id} className="animate-rise" style={{ animationDelay: `${300 + i * 60}ms` }}>
                    <BlockButton onClick={() => play(c)} className="group w-full text-left" faceClassName="flex items-center gap-3">
                      <Num n={i + 1} hover />
                      <span className="min-w-0 flex-1">
                        <span className="block font-line text-say leading-snug">{c.line}</span>
                        {showMeaning && <span className="mt-0.5 block text-note text-ink-subtle">{c.meaning}</span>}
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
              {/* 답을 고르면 무대 말풍선이 내 말로 바뀌어서, 무엇에 대한 답이었는지 잊지 않게 상대 말과 하고 싶던 말을 남겨 둔다 */}
              <Question name={scene.partnerName} line={situation.partnerLine} intent={situation.intent} />
              {/* 다른 보기의 반응을 비교해 보는 게 이 화면에서 배우는 방법이라, 고를 때처럼 Mochi가 권한다 */}
              <MochiAsk className="mt-3">다른 말도 눌러 볼래?</MochiAsk>
              <ul className="mt-3 space-y-3">
                {situation.choices.map((c, i) => (
                  <li key={c.id} className="animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
                    {c.id === choice.id ? (
                      <Panel className="blk-strong">
                        <div className="relative overflow-hidden px-3.5 pb-1 pt-3.5" aria-current="true">
                          {/* 판정 색을 옅게 깔아 두고, 방금 고른 순간에만 진하게 한 번 번쩍인다 */}
                          <span aria-hidden className={`pointer-events-none absolute inset-0 opacity-15 ${VERDICTS[c.verdict].color}`} />
                          {!reduced && (
                            <span key={`tint-${f.reactionKey}`} aria-hidden className={`pointer-events-none absolute inset-0 animate-tint ${VERDICTS[c.verdict].color}`} />
                          )}
                          <span className="relative block">
                            <ResultBody choice={c} n={i + 1} mine={c.id === pickedId} active showTrap={preview} revealed verdictKey={f.reactionKey} share={shareOf(c)} meta={false} />
                            {/* 더 보기와 메타는 카드 맨 아래 한 줄의 양 끝에 두고 힘을 뺀다 */}
                            <span className="mt-3.5 block border-t border-ink/10 pl-9">
                              {detailOpen && <span className="mt-3 block animate-fade text-ui leading-[1.6] text-ink-muted">{c.detail}</span>}
                              <span className="flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => setDetailOpen((v) => !v)}
                                  aria-expanded={detailOpen}
                                  className="-mx-1 flex min-h-11 items-center gap-1.5 px-1 text-meta text-ink-subtle underline decoration-ink/25 underline-offset-4 hover:text-ink hover:decoration-ink"
                                >
                                  {detailOpen ? "접기" : "왜 그런지 더 보기"}
                                  <Caret open={detailOpen} />
                                </button>
                                {(c.id === pickedId || shareOf(c) !== undefined) && <PickMeta mine={c.id === pickedId} share={shareOf(c)} className="justify-end" />}
                              </span>
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
              {/* 표현 출처는 선택지 카드마다가 아니라 이 상황에 한 번, 목록 아래에 작게 둔다 */}
              {situation.sources && situation.sources.length > 0 && (
                <p className="mt-3 text-meta leading-relaxed text-fg-subtle">출처 · {situation.sources.map((s) => `${s.phrase} — ${s.from}`).join(" · ")}</p>
              )}
              {f.done && preview && (
                <div className="blk mt-6 bg-surface px-4 py-3">
                  <p className="font-label text-ui text-fg-subtle">한 줄 정리</p>
                  <p className="mt-0.5 text-note leading-relaxed text-fg">{scene.discovery}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {(choice || leading || (phase === "transition" && !timeCue)) && (
          <footer className="relative shrink-0 border-t border-line/40 bg-page px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:col-start-2 md:row-start-3 md:mt-auto md:px-1 md:pb-8">
            {/* 대사가 저절로 넘어간다는 걸 알 수 있게 위 테두리를 남은 시간만큼 채운다 */}
            {beat && !reduced && !autoPaused && (
              <span
                key={`fill-${step}-${leadIdx}`}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-[3px] h-[3px] origin-left bg-pink"
                style={{ animation: `fill ${beatMs(beat)}ms linear both` }}
              />
            )}
            {leading ? (
              // 대사는 저절로 넘어가고, 메인 버튼(과 무대)을 누르면 바로 다음 줄로, 이미 본 장면이면 옆의 건너뛰기로 바로 질문에 간다
              <div className="flex items-center gap-2">
                {/* 대사는 저절로 넘어가니 "다음"은 재촉하는 보조 버튼이다. 대사보다 눈에 띄지 않게 흰 칸으로 둔다 */}
                <BlockButton onClick={nextBeat} reading className="flex-1" faceClassName="py-3 text-center text-body font-bold">
                  다음
                </BlockButton>
                <button type="button" onClick={() => setAutoPaused((v) => !v)} aria-pressed={autoPaused} className="min-h-11 shrink-0 px-2 font-label text-ui text-fg-muted hover:text-fg">
                  {autoPaused ? "자동 켜기" : "자동 멈춤"}
                </button>
                <button type="button" onClick={skipLead} className="min-h-11 shrink-0 px-3 font-label text-ui text-fg-muted hover:text-fg">
                  건너뛰기
                </button>
              </div>
            ) : phase === "transition" ? (
              <BlockButton primary onClick={f.enterFollowUp} className="w-full" faceClassName="py-3.5 text-center">
                이번엔 뭐라고 할까?
              </BlockButton>
            ) : f.done && preview ? (
              <BlockLink href={`/admin/scenes/${scene.id}`}>편집 화면으로</BlockLink>
            ) : f.done && !wrapped ? (
              <BlockButton primary onClick={wrapUp} className="w-full" faceClassName="py-3.5 text-center">
                다 봤어요
              </BlockButton>
            ) : f.done ? (
              next ? (
                <BlockLink href={`/scenes/${next.number}`} entry="next" primary reading={Boolean(teaser)} onClick={goNext}>
                  {teaser ?? "다음 장면"}
                </BlockLink>
              ) : (
                <BlockLink href="/" primary onClick={holdForEnding}>
                  모두 해 봤어요
                </BlockLink>
              )
            ) : (
              <BlockButton
                primary
                onClick={() => {
                  const good = scene.base.choices.find((c) => c.verdict === "good");
                  setRecover(timeCue && good && choice?.verdict !== "good" ? { who: "me", line: good.line, meaning: `(정신 차리고) ${good.meaning}` } : null);
                  sfx.whoosh();
                  f.startTransition();
                }}
                className="w-full"
                faceClassName="py-3.5 text-center"
              >
                {timeCue ? "이어서 보기" : "만약에 상황이 바뀐다면?"}
              </BlockButton>
            )}
          </footer>
        )}
        </div>
      </main>
    </div>
  );
}
