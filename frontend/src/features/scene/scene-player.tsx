"use client";

import Link from "next/link";
import { LogoLink } from "@/features/site/logo-link";
import { PrStatus } from "./pr-status";
import { useRouter } from "next/navigation";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { logoSvg, wordmarkSvg } from "@/features/site/logo";
import { useHeroLook } from "@/features/rewards/hero-look";
import { COLOR_HEX, isUnopened, usePendingRewards, useRewards } from "@/features/rewards/rewards";
import { playStreak, useStreakMoment } from "@/features/streak/streak";
// 장면 화면은 상대 대사가 무대 말풍선에만 있어서 three.js를 이 파일을 읽자마자 받기 시작한다.
// 다만 페이지 묶음에는 넣지 않아서, 받는 동안에도 글자와 선택지는 먼저 그려지고 누를 수 있다
import { preloadStage, Stage } from "@/features/stage/stage";
import { useBubbleScale } from "@/features/stage/stage-px";
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
import { markPlayed, PICK_PARAM, SHARE_PARAM, takeEntry, track, uuid, watchEngagement, type TrackEvent } from "./track";
import { useReducedMotion, useSceneFlow, useShare } from "./use-scene-flow";
import { TrapChip, BURSTS, SoundToggle, MochiAsk, Caret, MIN_PICKS, usePickStats, ResultBody, PickMeta } from "./scene-parts";
import { REACT_AFTER, REACT_AFTER_IMAGINE, STREAK_DELAY, AFTER_STREAK, PRIZE_MS, stagePrize, PrizeNote, WrapUp } from "./wrap-up";
import { beatMs, BeatDots, LeadRecap } from "./beat-log";
import { spoken } from "@/features/collection/pairs";
import { recordVoice } from "@/features/progression/voice";
import { FEATURES } from "@/features/site/lean";
import { HeardTrio, VerdictNote } from "./verdict";
import type { NextAsk } from "./wrap-up";

preloadStage();

const NO_REWARDS: ReturnType<typeof usePendingRewards> = [];

// 모바일 무대 높이와, 아래 글 칸이 무대 바닥을 덮는 깊이. 고르는 칸(질문·보기 셋)이 작은 폰에서도 한 화면에 들어오게 화면 높이에서 빼서 정하고,
// 덮는 깊이는 인물 발밑(무대 가운데에서 약 100px 아래)을 넘지 않게 무대 높이의 절반에서 110px을 뺀다
const STAGE_VARS = { "--stage-h": "max(36dvh, min(58dvh, 100dvh - 26rem))", "--stage-tuck": "max(0px, min(29dvh, 50dvh - 13rem) - 110px)" } as React.CSSProperties;
const STAGE_TUCK = "max-md:-mt-[var(--stage-tuck)]";
const STAGE_TUCK_LIFT = "max-md:bottom-[calc(var(--stage-tuck)+0.5rem)]";
// 얼굴 컷인이 떠 있는 시간
const CUT_IN_MS = 1800;
// 상대의 영어 겉말이 말풍선에 머무는 시간. 그 뒤 속마음 생각 풍선으로 바뀐다
const SAYS_MS = 1200;
// 이미 본 보기를 다시 누르면 겉말 없이 이만큼 뒤에 바로 속마음이 뜬다. 같은 반응을 다시 기다리게 하지 않는다
const REACT_AGAIN = 350;
// 장면에 들어와 첫 대사가 뜨기 전 무대만 보이는 시간
const INTRO_MS = 400;
// 겉말과 속마음 사이의 쉼. 펀치라인 앞의 한 박자가 웃음을 키운다(약 0.3~0.6초)
const SAYS_BEAT = 350;
// 고른 뒤 컷인이 뜨는 때. 효과음 글자가 터지는 순간(약 0.4초)에 맞춘다
const CUT_IN_AT = 350;
const MOCHI_TUCK_LIFT = "max-md:bottom-[calc(var(--stage-tuck)+2.25rem)]";


// teaser는 다음 장면 예고. 페이지가 서버에서 만들어 넘겨서 브라우저가 다음 장면 본문을 받지 않는다
// nextAsk는 다음 장면의 첫 질문. 완료 화면 아래로 밀려 올라와서, 고르면 그 답을 든 채 다음 장면에 들어간다
// entry는 들어온 경로를 정해 줄 때 쓴다(첫 방문 홈에서 바로 열린 장면은 home)
type PlayerProps = { scene: Scene; order?: { id: string; number: number }[]; teaser?: string | null; nextAsk?: NextAsk | null; preview?: boolean; entry?: "home"; packStep?: number };

// Next.js는 떠난 페이지를 숨겨 두기만 해서 상태가 남는다. 링크로 새로 들어오면 처음부터, 뒤로 가기로 돌아오면 하던 곳부터 보여준다
export function ScenePlayer(props: PlayerProps) {
  const { bfcacheId } = useRouter();
  return <SceneRun key={bfcacheId} {...props} />;
}

// 장면 하나를 처음 질문부터 정리까지 진행하는 화면. 검수 미리보기에서는 이벤트를 보내지 않고 함정 유형을 보여준다
function SceneRun({ scene: original, order = [], teaser = null, nextAsk = null, preview = false, entry, packStep }: PlayerProps) {
  const scene = useMemo(() => shuffleChoices(original), [original]);
  const [attemptId] = useState(uuid);
  const send = (e: Omit<TrackEvent, "sceneId" | "sceneVersion" | "attemptId">) => {
    if (preview) return;
    // 질문마다 첫 답이 어떤 함정에 걸렸는지 "내 영어 말투"에 모은다
    if (e.type === "choice_selected" && e.step && e.choiceId) {
      const trap = (e.step === "base" ? scene.base : scene.followUp).choices.find((c) => c.id === e.choiceId)?.trap;
      recordVoice(scene.id, e.step, trap);
    }
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
    const taken = takeEntry();
    track({ type: "scene_viewed", sceneId: scene.id, sceneVersion: scene.version, attemptId, entry: taken === "direct" && entry ? entry : taken });
  }, [scene.id, scene.version, attemptId, preview, entry]);
  useEffect(() => (preview ? undefined : watchEngagement({ sceneId: scene.id, sceneVersion: scene.version, attemptId })), [scene.id, scene.version, attemptId, preview]);

  useEffect(primeAudio, []);

  const f = useSceneFlow(scene, send);
  const look = useHeroLook();
  const rewards = useRewards();
  // 보상과 연속 기록은 입구를 닫아 둔 동안 완료 화면과 무대에 띄우지 않는다(site/lean.ts)
  const pendingRewards = usePendingRewards(scene.id);
  const granted = FEATURES.rewards ? pendingRewards : NO_REWARDS;
  const pendingStreak = useStreakMoment(scene.id);
  const streakMoment = FEATURES.streak ? pendingStreak : null;
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
  const pickedIdsAll = [f.picked.base, f.picked.followUp].filter((id): id is string => id !== null);
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
  // 다른 탭에 가 있는 동안 멈춘 자동 넘김. 돌아와서 화면을 한 번 누르면 다시 흐른다
  const [autoPaused, setAutoPaused] = useState(false);
  const leading = phase !== "transition" && !wrapped && leadIdx < lead.length;
  // 장면에 들어오면 첫 대사 전에 무대만 잠깐 보여 준다. 누가 어디 있는지 눈이 자리 잡은 뒤에 말이 시작된다
  const [introDone, setIntroDone] = useState(reduced);
  useEffect(() => {
    if (introDone) return;
    const t = window.setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(t);
  }, [introDone]);
  const beat = leading && introDone ? lead[leadIdx] : null;
  const played = phase === "transition" ? [] : lead.slice(0, leading ? leadIdx + 1 : lead.length);
  const leadFlags = played.flatMap((b) => b.flags ?? []).join(",");
  // 소품은 대사가 흐르는 동안 마지막으로 든 것을 계속 들고 있는다
  const heldMe = leading ? played.findLast((b) => b.who === "me" && b.prop)?.prop : undefined;
  const heldPartner = leading ? played.findLast((b) => b.who === "partner" && b.prop)?.prop : undefined;
  // 대사가 끝날 때 끝까지 봤는지(저절로 흐르거나 눌러 넘김) 건너뛰었는지 한 번 남긴다. 대사 도중에 나가는지 보려는 것이다
  const lastBeat = leadIdx + 1 >= lead.length;
  const nextBeat = () => {
    if (!introDone) return setIntroDone(true);
    if (lastBeat) {
      send({ type: "lead_finished", step, choiceId: "watched" });
    }
    setLeadAt((a) => ({ ...a, [step]: a[step] + 1 }));
    setAutoPaused(false);
  };
  // 데스크톱에서는 "바로 고르기"가 있던 자리에 보기가 올라온다. 버튼을 연달아 눌러 첫 보기가 골라지지 않게, 건너뛴 직후 잠깐은 고르기를 받지 않는다
  const pickAfter = useRef(0);
  const skipLead = () => {
    send({ type: "lead_finished", step, choiceId: "skipped" });
    pickAfter.current = performance.now() + 450;
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
  // 이미 들어 본 보기를 다시 누른 것인지. 자주 보는 연출일수록 짧게 한다
  const [heard, setHeard] = useState<Record<string, string[]>>({ base: [], followUp: [] });
  const heardIds = heard[step];
  const [repeatView, setRepeatView] = useState(false);
  const reactWait = !stageChoice || endingOn || beat || wrapped ? null : reduced ? 0 : repeatView ? REACT_AGAIN : stageChoice.imagine ? REACT_AFTER_IMAGINE : REACT_AFTER;
  useEffect(() => {
    if (reactWait === null) return;
    const t = window.setTimeout(() => setReactedKey(stageKey), reactWait);
    return () => clearTimeout(t);
  }, [stageKey, reactWait]);
  const partnerReacts = reactWait !== null && reactedKey === stageKey;
  // 결과 카드는 무대에서 상대가 반응하는 순간에 같이 채운다. 그 전에는 고른 말만 보이고 판정 색도 깔지 않는다

  // 겉말이 있는 반응은 상대가 영어로 먼저 말하고(말풍선), 잠시 뒤 속마음(생각 풍선)이 뜬다. 실제로는 속마음을 말해 주지 않는다는 걸 보여 준다
  const [thoughtKey, setThoughtKey] = useState<number | null>(null);
  const hasSays = Boolean(stageChoice?.says) && !repeatView;
  useEffect(() => {
    if (!partnerReacts || !hasSays) return;
    const t = window.setTimeout(() => setThoughtKey(stageKey), SAYS_MS + SAYS_BEAT);
    return () => clearTimeout(t);
  }, [partnerReacts, hasSays, stageKey]);
  const speaking = !reduced && partnerReacts && hasSays && thoughtKey !== stageKey;
  const cardRevealed = reduced || (partnerReacts && !speaking);
  useEffect(() => {
    if (!cardRevealed || !choice || wrapped || leading) return;
    const id = choice.id;
    const frame = requestAnimationFrame(() => {
      setHeard((prev) => prev[step].includes(id) ? prev : { ...prev, [step]: [...prev[step], id] });
    });
    return () => cancelAnimationFrame(frame);
  }, [cardRevealed, choice, wrapped, leading, step]);
  // 겉말이 내려간 뒤 속마음이 뜨기 전 한 박자. 이때는 반응 기호만 남아 펀치라인 앞의 쉼이 된다
  const [beatKey, setBeatKey] = useState<number | null>(null);
  useEffect(() => {
    if (!partnerReacts || !hasSays) return;
    const t = window.setTimeout(() => setBeatKey(stageKey), SAYS_MS);
    return () => clearTimeout(t);
  }, [partnerReacts, hasSays, stageKey]);
  const pausing = speaking && beatKey === stageKey;
  // 반응을 기다리는 중에 무대를 누르면 남은 순서를 건너뛰고 속마음과 결과를 바로 보여 준다
  const skipReaction = () => {
    setReactedKey(stageKey);
    setBeatKey(stageKey);
    setThoughtKey(stageKey);
  };
  // 오해가 터지는 말(효과음이 "헉!"·"엥?" 쪽인 반응)에만, 효과음이 터지는 순간 상대 얼굴 컷인을 한 번 띄웠다가 내린다.
  // 웃긴 건 놀란 얼굴이라 평온한 반응에는 띄우지 않는다. 동작 줄이기 설정이면 띄우지 않는다
  const shocked = Boolean(stageChoice && BURSTS[stageChoice.expression].bad) && !endingOn && !beat && !wrapped && phase !== "transition" && !reduced && !repeatView;
  const [cutAt, setCutAt] = useState<{ key: number; on: boolean } | null>(null);
  useEffect(() => {
    if (!shocked) return;
    const show = window.setTimeout(() => setCutAt({ key: stageKey, on: true }), CUT_IN_AT);
    const hide = window.setTimeout(() => setCutAt({ key: stageKey, on: false }), CUT_IN_AT + CUT_IN_MS);
    return () => (clearTimeout(show), clearTimeout(hide));
  }, [shocked, stageKey]);
  const cutIn = shocked && cutAt?.key === stageKey && cutAt.on;

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
  // 사용자가 읽는 위치를 우선한다. 선택한 줄만 보존하고 결과가 나와도 자동으로 끌고 가지 않는다.
  const choiceAnchor = useRef<{ id: string; top: number } | null>(null);
  useEffect(() => {
    const cancel = () => { choiceAnchor.current = null; };
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchmove", cancel, { passive: true });
    window.addEventListener("keydown", cancel);
    return () => {
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchmove", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, []);
  useLayoutEffect(() => {
    const anchor = choiceAnchor.current;
    choiceAnchor.current = null;
    if (!anchor || !scroller.current) return;
    const el = Array.from(scroller.current.querySelectorAll<HTMLElement>("[data-choice-id]")).find((el) => el.dataset.choiceId === anchor.id);
    if (el) scroller.current.scrollTop += el.getBoundingClientRect().top - anchor.top;
  }, [choice]);

  // X일 때만 무대 칸을 짧게 흔든다. 화면 전체가 아니라 무대만 흔들어서 틀렸다는 신호로만 쓴다
  const stageBox = useRef<HTMLDivElement>(null);
  const shake = () => {
    if (reduced) return;
    stageBox.current?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }],
      { duration: 280, delay: 60, easing: "ease-out" },
    );
  };

  // 홈에서 보기를 바로 고르고 들어오면(주소의 pick) 대사 없이 그 답에 대한 반응부터 보여 준다. 홈에서 이미 고른 사람을 다시 기다리게 하지 않는다
  useEffect(() => {
    const id = new URLSearchParams(location.search).get(PICK_PARAM);
    if (!id) return;
    history.replaceState(null, "", location.pathname);
    if (!scene.base.choices.some((c) => c.id === id)) return;
    const t = window.setTimeout(() => {
      setLeadAt((a) => ({ ...a, base: 99 }));
      send({ type: "lead_finished", step: "base", choiceId: "home_pick" });
      f.pick(id);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 고른 말에 맞춰 소리를 낸다
  // 누르는 순간에는 "톡"만 내고, 판정 소리·흔들림·진동은 상대가 반응해 도장이 찍히는 순간으로 미룬다. 소리가 결과를 먼저 알려 주지 않게 한다.
  // 숫자 키로 빠르게 비교할 때는 되감기 연출을 뺀다
  const [keyPick, setKeyPick] = useState(false);
  const play = (c: Choice, viaKey = false) => {
    if (c.id === choice?.id || performance.now() < pickAfter.current) return;
    sfx.tap();
    const el = Array.from(scroller.current?.querySelectorAll<HTMLElement>("[data-choice-id]") ?? []).find((el) => el.dataset.choiceId === c.id);
    choiceAnchor.current = el ? { id: c.id, top: el.getBoundingClientRect().top } : null;
    setRepeatView(heardIds.includes(c.id));
    setKeyPick(viaKey);
    f.pick(c.id);
  };

  // 메뉴처럼 숫자 키 1·2·3으로도 보기를 고른다. 보기가 보이는 동안(질문과 결과 비교)만 받는다
  const choosing = !leading && !wrapped && phase !== "transition";
  // 보기가 넷 이상인 상황은 처음엔 원래 있던 세 개로 고르게 하고, 첫 답 뒤에 나머지를 목록 끝에 붙인다. 고르기 전에 읽을 것은 적게, 구경할 것은 많게
  const origSituation = later ? original.followUp : original.base;
  const coreIds = new Set(origSituation.choices.slice(0, 3).map((c) => c.id));
  const core = situation.choices.filter((c) => coreIds.has(c.id));
  const extra = situation.choices.filter((c) => !coreIds.has(c.id));
  const shown = choice || preview ? [...core, ...extra] : core;

  // 상대가 반응해 결과가 채워지는 순간: 판정 소리, X면 무대 흔들림, 틀린 말이면 짧은 진동(지원하는 기기만), 그리고 카드가 다 보이게 맞춘다
  const revealedAt = useRef<number | null>(null);
  useEffect(() => {
    if (!cardRevealed || !stageChoice || wrapped || endingOn || beat || revealedAt.current === stageKey) return;
    revealedAt.current = stageKey;
    sfx[stageChoice.verdict]();
    if (stageChoice.verdict === "bad") shake();
    if (stageChoice.verdict !== "good" && !reduced) navigator.vibrate?.(12);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardRevealed, stageKey]);
  // 고르기 전, 마우스를 올리거나 키보드로 짚은 보기. 그 말을 무대의 내 생각 풍선에 미리 얹어서 오른쪽 보기와 왼쪽 무대가 한 동작으로 이어지게 한다
  const [tryId, setTryId] = useState<string | null>(null);
  const trying = choosing && !choice ? situation.choices.find((c) => c.id === tryId) : undefined;
  const { ref: stageSize, scale: bubbleScale } = useBubbleScale<HTMLDivElement>();
  useEffect(() => {
    if (!choosing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest("input, textarea, select, dialog")) return;
      const c = shown[Number(e.key) - 1];
      if (!c) return;
      e.preventDefault();
      play(c, true);
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
      {/* 다음 장면으로 넘어오면 화면이 뚝 바뀌지 않고 아래에서 살짝 올라온다(쇼츠의 다음 영상처럼) */}
      <main style={STAGE_VARS} className="relative flex h-dvh animate-rise w-full max-w-[480px] flex-col bg-page md:grid md:max-w-[1200px] md:grid-cols-[minmax(0,1fr)_minmax(480px,1.1fr)] lg:max-w-[1360px] lg:grid-cols-[minmax(0,1.3fr)_minmax(440px,1fr)] md:grid-rows-[auto_minmax(0,max-content)] md:content-start md:gap-x-10 md:px-8">
        {/* 모바일은 머리줄과 무대를 검은 띠로 묶고, 데스크톱은 다른 화면처럼 머리줄만 화면 너비로 검게 둔다 */}
        <div className="shrink-0 md:contents">
        <header className="relative isolate flex h-14 shrink-0 items-center gap-2 bg-ink px-4 font-label text-ui text-fg md:col-span-2 md:h-16 md:bg-transparent md:px-0 md:before:absolute md:before:inset-y-0 md:before:left-1/2 md:before:-z-10 md:before:w-screen md:before:-translate-x-1/2 md:before:bg-ink">
          {/* 다른 화면 머리줄과 같은 마크+글자 로고. 제목 자리가 좁아서 조금 작게 둔다. 첫 방문 중에는 소개 화면으로 간다(LogoLink) */}
          {preview ? (
            <Link href={`/admin/scenes/${scene.id}`} className="-ml-2 flex h-11 shrink-0 items-center gap-1.5 px-2">
              <span className="logo">검수</span>
            </Link>
          ) : (
            <LogoLink className="-ml-2 flex h-11 shrink-0 items-center gap-1.5 px-2">
              <span aria-hidden className="block size-6 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: logoSvg() }} />
              <span aria-hidden className="block h-[18px] w-[67px] [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: wordmarkSvg() }} />
            </LogoLink>
          )}
          <h1 className="min-w-0 truncate text-fg">{scene.title}</h1>
          {/* 개발자 팩은 몇 화인지 대신 PR이 지금 어느 단계인지 보여 준다 */}
          {packStep !== undefined && <PrStatus step={packStep} />}
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

        <div className="md:self-start md:pt-5">
          {/* 데스크톱은 상황 한 줄을 무대 바로 위에 둔다. 대사가 흐르는 동안 읽을 것(상황·대사·자막)이 전부 왼쪽에 있어야 눈이 오른쪽 칸과 무대를 오가지 않는다.
              오른쪽 칸 맨 위 Mochi 한마디와 같은 높이에 놓여, 왼쪽은 "무슨 상황인지", 오른쪽은 "내가 할 일"로 나뉜다.
              무대 띠(bg-ink) 안에 두면 글자가 흰색으로 바뀌어서 띠 밖에 둔다 */}
          <p className="mb-2.5 hidden min-h-10 items-end text-body leading-snug text-fg-muted md:flex">{stageSituation.context}</p>
        <div ref={stageBox} onClick={leading ? nextBeat : choice && !wrapped && (!partnerReacts || speaking) ? skipReaction : undefined} className="shrink-0 bg-ink md:bg-transparent md:pb-8">
          <Panel>
            {/* 모바일 무대는 세로로 길게 둔다. 카메라 배율은 무대 너비로 정해져서 인물 크기는 그대로고 방이 위아래로 더 보인다.
                무대 아래쪽 바닥은 아래 글 칸이 덮으며 올라온다(STAGE_TUCK). 데스크톱은 4:3 그대로다 */}
            <div ref={stageSize} style={{ "--stage-px": bubbleScale } as React.CSSProperties} className="relative h-[var(--stage-h)] w-full overflow-hidden md:aspect-[4/3] md:h-auto md:max-h-[calc(100dvh-10rem)]">
              <Stage
                spec={spec}
                reduced={reduced}
                bubbleScale={bubbleScale}
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
                      : // 이음 대사가 있는 장면은 전환 중에 다음 질문을 미리 띄우지 않는다. 첫 대사 전 무대만 보이는 동안에도 질문을 띄우지 않는다
                        (phase === "transition" && scene.followUp.lead?.length) || leading
                        ? undefined
                        : stageSituation.partnerLine,
                  partnerSpeaks: speaking && !pausing ? stageChoice?.says : undefined,
                  partnerSays: partnerReacts && !speaking ? stageChoice?.reaction : undefined,
                  meTurn: phase !== "transition" && !choice && !leading,
                  meThink: spoken(stageSituation.intent),
                  meTry: trying?.line,
                  cutIn,
                }}
              />
              {beat?.who === "mochi" && <MochiCameo step="punch" line={beat.line} className={MOCHI_TUCK_LIFT} />}
              {beat && <BeatDots total={lead.length} at={leadIdx} />}
              {/* 대사가 저절로 넘어가기까지 남은 시간. 데스크톱은 무대 아래 테두리를 따라 채운다(모바일은 하단 버튼 위) */}
              {beat && !reduced && !autoPaused && (
                <span
                  key={`stage-fill-${step}-${leadIdx}`}
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-1 origin-left bg-pink md:block"
                  style={{ animation: `fill ${beatMs(beat)}ms linear both` }}
                />
              )}
              {/* 대화 기록을 아래에 따로 쌓지 않고, 번역은 무대 위 자막으로 얹는다. 상황 묘사("……")는 번역이 아니라서 늘 보인다 */}
              {beat && (translate || beat.line === "……") && beat.who !== "mochi" && <Subtitle key={`sub-${leadIdx}`} text={beat.meaning} className={STAGE_TUCK_LIFT} />}
              {/* 두 번째 말부터는 무대가 한 번 뒤로 감긴 뒤 다른 말로 다시 재생된다 */}
              {seenIds.length > 1 && !keyPick && !wrapped && !reduced && phase !== "transition" && (
                <div key={`rewind-${f.reactionKey}`} aria-hidden className="pointer-events-none absolute inset-0 grid animate-rewind place-items-center bg-ink/60">
                  <svg width="64" height="32" viewBox="0 0 16 8" shapeRendering="crispEdges" className="fill-white">
                    <path d="M7 0h1v8H7V7H6V6H5V5H4V3h1V2h1V1h1zM15 0h1v8h-1V7h-1V6h-1V5h-1V3h1V2h1V1h1z" />
                  </svg>
                </div>
              )}
              {endingOn && ending.who === "mochi" && <MochiCameo step={endingStep} line={ending.line} className={MOCHI_TUCK_LIFT} />}
              {endingOn && endingStep === "punch" && translate && <Subtitle text={ending.meaning} className={STAGE_TUCK_LIFT} />}
              {later && !endingOn && !beat && (
                <p className={`absolute bottom-2 left-2 animate-fade bg-ink px-2 py-1 font-label text-ui leading-none text-fg ${STAGE_TUCK_LIFT}`}>
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
                  style={{ zoom: "var(--stage-px, 1)" }}
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
        </div>

        {/* 데스크톱 오른쪽 칸은 내용만큼만 길어지고, 짧으면 버튼을 무대 아래 끝선에 맞춘다. 화면보다 길어질 때만 글 영역이 스크롤된다 */}
        <div className="contents md:col-start-2 md:row-start-2 md:flex md:min-h-0 md:flex-col">
        {/* 데스크톱에서는 오른쪽 패널만 따로 스크롤된다. 위아래 끝을 흐리게 해서 더 있다는 걸 보여 주고, 스크롤바 자리를 미리 비워 글이 옆으로 밀리지 않게 한다 */}
        <section
          ref={scroller}
          onClick={leading ? nextBeat : undefined}
          className={`scroll-area relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t-2 border-fg bg-page px-4 pb-8 pt-5 [mask-image:linear-gradient(to_bottom,#000_calc(100%-24px),transparent)] md:flex-initial md:border-t-0 md:bg-transparent md:px-1 md:pt-6 md:[mask-image:linear-gradient(to_bottom,#000_calc(100%-32px),transparent)] ${STAGE_TUCK}`}
        >
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
              pickedIds={pickedIdsAll}
              nextAsk={nextAsk}
              askAt={ending && !reduced ? PUNCH_AT + PUNCH_HOLD : 600}
              onNext={() => send({ type: "next_clicked" })}
            />
          ) : (
            // 대사가 흐르는 동안, 고르는 동안, 결과를 비교하는 동안을 한 칸으로 잇는다. 보기 목록은 고를 때 다시 그리지 않고 제자리에 둔 채,
            // 누른 보기만 그 자리에서 결과 카드로 바뀐다. 누른 것이 손가락 밑에서 사라지거나 목록이 다시 올라오지 않게 한다.
            // 모바일은 대사 동안 상황 한 줄만 두고 어디를 눌러도 다음 줄로 넘어간다. 고를 때는 작은 폰(375×667)에서도 보기 세 개가 스크롤 없이 들어온다
            <div key={`turn-${phase}`} className={leading ? "min-h-full cursor-pointer" : undefined}>
              {/* 데스크톱은 상황 한 줄이 무대 위에 있다 */}
              <p className="text-note leading-normal text-fg-muted md:hidden">{situation.context}</p>
              {!leading && lead.length > 0 && (
                <div className="md:hidden">
                  <LeadRecap beats={lead} partnerName={scene.partnerName} translate={translate} />
                </div>
              )}
              {/* 상대 말은 무대 말풍선, 하고 싶은 말은 내 머리 위 생각 풍선에 있다. 아래에는 Mochi의 한마디와 보기만 둬서 고르기 전에 읽을 덩어리를 줄인다 */}
              <div className={leading ? "hidden md:block" : undefined} onClick={leading ? (e) => e.stopPropagation() : undefined}>
                {/* 세 가지 말을 다 해 보는 게 이 화면의 놀이다. 몇 개를 들어 봤는지 같이 보여 주고, 하나 더 들을 때마다 Mochi가 콩 뛴다 */}
                <MochiAsk className={leading ? "" : "mt-3 md:mt-0"} cheer={heardIds.length} cheerTwice={heardIds.length >= situation.choices.length}>
                  <span key={leading ? "watch" : choice ? "count" : "ask"} className="block md:animate-fade">
                    {leading ? (
                      "무슨 일인지 먼저 볼까?"
                    ) : !choice ? (
                      "너라면 뭐라고 할래?"
                    ) : heardIds.length < situation.choices.length ? (
                      <>
                        다른 말도 해 볼래? <span className="tabular-nums text-ink-subtle">{heardIds.length}/{situation.choices.length}</span>
                      </>
                    ) : (
                      "다 해 봤네!"
                    )}
                  </span>
                </MochiAsk>
                {leading ? (
                  <BlockButton onClick={skipLead} className="mt-2 w-full" faceClassName="py-3 text-center text-body font-bold">
                    바로 고르기
                  </BlockButton>
                ) : (
                  <>
                  <div className="flex min-h-11 items-center justify-end">
                    {choice && !cardRevealed && <button type="button" onClick={skipReaction} className="min-h-11 px-2 text-note underline">결과 바로 보기</button>}
                  </div>
                  <ul className="mt-2 space-y-2.5">
                    {shown.map((c, i) => (
                      <li
                        key={c.id}
                        data-choice-id={c.id}
                        className="animate-rise"
                        // 처음 그릴 때만 올라온다. 고른 뒤에 붙는 나머지 보기도 짧게 차례로 올라온다
                        style={{ animationDelay: `${choice ? (i - core.length) * 50 : 40 + i * 40}ms` }}
                        // 보기가 마우스 밑에서 올라왔을 때 미리 고른 것처럼 보이지 않게, 마우스가 실제로 움직였을 때만 얹는다
                        onPointerMove={(e) => !choice && e.pointerType === "mouse" && tryId !== c.id && setTryId(c.id)}
                        onPointerLeave={() => setTryId((t) => (t === c.id ? null : t))}
                        onFocus={(e) => !choice && e.target.matches(":focus-visible") && setTryId(c.id)}
                        onBlur={() => setTryId((t) => (t === c.id ? null : t))}
                      >
                        {!choice ? (
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
                        ) : c.id === choice.id ? (
                          <Panel className="blk-strong">
                            <div className="relative overflow-hidden px-3.5 pb-1 pt-3.5" aria-current="true">
                              {/* 판정 색은 도장이 찍히는 순간 같이 깔린다. 색이 내용보다 먼저 오면 빈 덩어리처럼 보인다 */}
                              {cardRevealed && <span key={`base-${f.reactionKey}`} aria-hidden className={`pointer-events-none absolute inset-0 animate-fade opacity-15 ${VERDICTS[c.verdict].color}`} />}
                              {cardRevealed && !reduced && (
                                <span key={`tint-${f.reactionKey}`} aria-hidden className={`pointer-events-none absolute inset-0 animate-tint ${VERDICTS[c.verdict].color}`} />
                              )}
                              <span className="relative block">
                                <ResultBody choice={c} n={i + 1} mine={c.id === pickedId} active showTrap={preview} revealed verdictKey={f.reactionKey} share={shareOf(c)} meta={false} intent={situation.intent} waiting={!cardRevealed} />
                                {/* 더 보기와 메타는 카드 맨 아래 한 줄의 양 끝에 두고 힘을 뺀다 */}
                                <span className="mt-3.5 block border-t border-ink/10 pl-9">
                                  {cardRevealed && detailOpen && <span className="mt-3 block animate-fade text-ui leading-[1.6] text-ink-muted">{c.detail}</span>}
                                  <span className="flex items-center justify-between gap-3">
                                    <button
                                      type="button"
                                      disabled={!cardRevealed}
                                      onClick={() => setDetailOpen((v) => !v)}
                                      aria-expanded={detailOpen}
                                      className="-mx-1 flex min-h-11 items-center gap-1.5 px-1 text-meta text-ink-subtle underline decoration-ink/25 underline-offset-4 hover:text-ink hover:decoration-ink"
                                    >
                                      {detailOpen ? "접기" : "왜 그런지 더 보기"}
                                      <Caret open={detailOpen} />
                                    </button>
                                    <span className="flex flex-col items-end gap-1">
                                      {cardRevealed && <VerdictNote choice={c} />}
                                      {(c.id === pickedId || (shareOf(c) ?? 0) > 0) && <PickMeta mine={c.id === pickedId} share={shareOf(c)} className="justify-end" />}
                                    </span>
                                  </span>
                                </span>
                              </span>
                            </div>
                          </Panel>
                        ) : (
                          <BlockButton onClick={() => play(c)} className="w-full text-left">
                            <ResultBody choice={c} n={i + 1} mine={c.id === pickedId} active={false} showTrap={preview} revealed={heardIds.includes(c.id)} share={shareOf(c)} />
                          </BlockButton>
                        )}
                      </li>
                    ))}
                  </ul>
                  </>
                )}
              </div>
              {/* 세 말을 다 해 보면 도장을 나란히 모아 준다. 목록이 밀리지 않게 목록 아래에 붙는다 */}
              {choice && heardIds.length >= situation.choices.length && <HeardTrio intent={situation.intent} choices={situation.choices} />}
              {/* 표현 출처는 선택지 카드마다가 아니라 이 상황에 한 번, 목록 아래에 작게 둔다 */}
              {choice && situation.sources && situation.sources.length > 0 && (
                <p className="mt-3 text-meta leading-relaxed text-fg-subtle">출처 · {situation.sources.map((src) => `${src.phrase} — ${src.from}`).join(" · ")}</p>
              )}
              {f.done && preview && (
                <div className="blk mt-6 bg-surface px-4 py-3">
                  <p className="font-label text-ui text-fg-subtle">한 줄 정리</p>
                  <p className="mt-0.5 text-note leading-relaxed text-fg">{scene.discovery}</p>
                </div>
              )}
              {/* 데스크톱은 Mochi와 보기가 칸 맨 위에 붙어 있도록 앞 대화 다시 보기를 보기 아래에 둔다 */}
              {!leading && lead.length > 0 && (
                <div className="hidden md:block">
                  <LeadRecap beats={lead} partnerName={scene.partnerName} translate={translate} />
                </div>
              )}
            </div>
          )}
        </section>

        {(choice || leading || (phase === "transition" && !timeCue)) && (
          <footer className={`relative shrink-0 border-t border-line/40 bg-page px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:col-start-2 md:row-start-3 md:mt-auto md:px-1 md:pb-8 ${leading ? "md:hidden" : ""}`}>
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
              // 다음 줄로 넘기기는 화면 아무 데나 누르면 된다. 버튼 자리에는 대사를 건너뛰고 바로 고르기 하나만 흰 보조 버튼으로 둔다.
              // 데스크톱은 이 버튼이 오른쪽 칸 Mochi 한마디 바로 아래에 있어서 하단 칸을 감춘다
              <BlockButton onClick={skipLead} className="w-full" faceClassName="py-3 text-center text-body font-bold">
                바로 고르기
              </BlockButton>
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
