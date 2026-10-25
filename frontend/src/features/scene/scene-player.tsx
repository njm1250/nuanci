"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useEffect, useMemo, useRef, useState } from "react";
import { bookEntry, spoken } from "@/features/collection/pairs";
import { Mascot } from "@/features/mascot/mascot";
import { useHeroLook } from "@/features/rewards/hero-look";
import { RewardIcon } from "@/features/rewards/reward-icon";
import { RewardReveal } from "@/features/rewards/reward-reveal";
import { COLOR_HEX, isUnopened, usePendingRewards, useRewards, type RewardItem } from "@/features/rewards/rewards";
import { playStreak, useStreakMoment, type StreakMoment } from "@/features/streak/streak";
import { StreakMomentCard } from "@/features/streak/streak-ui";
// 장면 화면은 상대 대사가 무대 말풍선에만 있어서 three.js를 이 파일을 읽자마자 받기 시작한다.
// 다만 페이지 묶음에는 넣지 않아서, 받는 동안에도 글자와 선택지는 먼저 그려지고 누를 수 있다
import { preloadStage, Stage } from "@/features/stage/stage";
import type { AccessoryId, StageSpec, Worn } from "@/features/stage/types";
import { BlockButton, BlockLink, Panel } from "./block-ui";
import { shuffleChoices } from "./choice-order";
import { BEAT_AT, MochiCameo, PUNCH_AT, PUNCH_HOLD, Subtitle, type EndingStep } from "./ending";
import { ImagineBubble } from "./imagine-bubble";
import { ReactionFace } from "./reaction-face";
import { primeAudio, sfx, toggleSound, useSoundEnabled } from "./sfx";
import { TRAP_LABELS, type Beat, type Choice, type Expression, type Scene, type Verdict } from "./types";
import { markCleared, nextScene, useCleared } from "./progress";
import { markPlayed, SHARE_PARAM, takeEntry, track, uuid, type TrackEvent } from "./track";
import { useReducedMotion, useSceneFlow, useShare } from "./use-scene-flow";

preloadStage();

function Num({ n, dark = false }: { n: number; dark?: boolean }) {
  return <span className={`grid size-6 shrink-0 place-items-center font-pixel text-[15px] ${dark ? "bg-card text-ink" : "bg-ink text-paper"}`}>{n}</span>;
}

// 검수 미리보기에서만 보이는 함정 유형 표시
function TrapChip({ choice }: { choice: Choice }) {
  return <span className="shrink-0 border-2 border-current px-1 py-0.5 font-pixel-title text-[12px] leading-none opacity-80">{choice.trap ? TRAP_LABELS[choice.trap] : "전달됨"}</span>;
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

// 고른 말의 판정. 초등학교 "참 잘했어요" 도장처럼 글자를 새긴 도장으로 찍어서 색만으로 구분하지 않는다
const VERDICTS: Record<Verdict, { label: string; color: string; stamp: string }> = {
  good: { label: "자연스러워요", color: "bg-good", stamp: "참 잘했어요" },
  meh: { label: "상황에 따라 어색해요", color: "bg-warn", stamp: "애매해요" },
  bad: { label: "어색해요", color: "bg-bad", stamp: "사고 발생" },
};

// 살짝 기운 채로 찍히는 판정 도장. 픽셀 무대에 맞게 부드럽게 커지지 않고 몇 프레임으로 끊어서 쾅 찍힌다
function VerdictStamp({ choice, pop = false }: { choice: Choice; pop?: boolean }) {
  const v = VERDICTS[choice.verdict];
  // 지금 보고 있는 줄에는 기호 옆에 판정 글자도 같이 찍는다
  return (
    <span
      role="img"
      aria-label={choice.trap ? `${v.label} · ${TRAP_LABELS[choice.trap]}` : v.label}
      className={`-rotate-6 shrink-0 whitespace-nowrap border-2 border-ink px-1.5 py-1 font-pixel-title text-[12px] leading-none text-ink outline-2 outline-offset-1 outline-ink ${v.color} ${pop ? "animate-[stamp_280ms_steps(4,end)_60ms_both]" : ""}`}
    >
      {v.stamp}
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

// 이 장면의 질문: 상대가 한 말과 내가 하고 싶은 말. 무대 말풍선은 작아서 상대 말을 여기서 가장 크게 다시 보여주고, 내 마음은 한 단계 작게 둔다
function Question({ name, line, intent, className = "" }: { name: string; line: string; intent: string; className?: string }) {
  const tag = "shrink-0 justify-self-start bg-ink px-1.5 py-1 font-pixel text-[13px] leading-none text-paper";
  return (
    <div className={`grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-1 ${className}`}>
      <span className={tag}>{name}</span>
      <p className="font-line text-[21px] leading-snug text-paper">{line}</p>
      <span className={tag}>나</span>
      <p className="font-pixel text-[15px] leading-snug text-paper">{intent}</p>
    </div>
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
      반응 보기
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
          <span className="font-line text-[20px] leading-snug">{choice.line}</span>
          <span className="flex shrink-0 items-center gap-1.5 pt-1">
            {showTrap && <TrapChip choice={choice} />}
            {revealed && <VerdictStamp key={verdictKey} choice={choice} pop={active} />}
          </span>
        </span>
        {revealed ? (
          <span className={`mt-1.5 flex items-start gap-2 leading-snug ${active ? "text-[16px] font-semibold text-paper" : "text-[15px] text-ink-muted"}`}>
            <span className="mt-px">
              <ReactionFace expression={choice.expression} size={18} />
            </span>
            {choice.reaction}
          </span>
        ) : (
          <HiddenReaction />
        )}
        {active && <span className="mt-2 block text-[16px] leading-relaxed text-paper-muted">{choice.why}</span>}
        {revealed && (mine || share !== undefined) && (
          <span className={`mt-1.5 block text-[13px] tabular-nums ${active ? "text-paper-muted" : "text-ink-subtle"}`}>
            {mine && <span className="font-semibold">내 선택</span>}
            {mine && share !== undefined && " · "}
            {share !== undefined && `첫 답으로 ${share}%가 골랐어요`}
          </span>
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

// 완료 화면의 팡파르(0.75초부터 1.6초쯤까지)가 끝난 뒤 연속 기록 줄이 들어오고, 새 물건 카드는 그다음에 들어온다.
// 축하 소리가 겹치지 않게 하나씩 차례로 울린다
const STREAK_DELAY = 1600;
const AFTER_STREAK = 750;
// 새 물건 카드가 들어오는 순간 주인공도 무대에서 그 물건을 받고, 이만큼 보여준 뒤 원래 엔딩으로 돌아간다
const PRIZE_MS = 4000;

// 완료 화면에서 무대에 올릴 새 물건. 쓰는 아이템을 먼저 골라 주인공이 직접 써 보게 한다
function stagePrize(granted: RewardItem[]) {
  return granted.find((i) => i.kind === "wear" && !isUnopened(i)) ?? granted[0] ?? null;
}

// 무대 위 주인공 말풍선에 띄우는 새 물건. 상자는 열기 전이라 무엇인지 감춘다
function PrizeNote({ item }: { item: RewardItem }) {
  const box = isUnopened(item);
  return (
    <span className="flex items-center gap-1.5">
      <RewardIcon id={box ? "box" : item.id} color={item.owned?.color} size={24} />
      <span>{box ? "깜짝 상자다!" : `${item.name} 득템!`}</span>
    </span>
  );
}

// 장면을 끝낸 뒤의 완료 화면. 이 장면의 발견(한 줄 정리와 모은 표현)을 가운데 두고, 연속 기록·새 물건은 작게 덧붙인 뒤 친구에게 문제 내기를 권한다
function WrapUp({
  scene,
  share,
  shareState,
  onBack,
  granted,
  reduced,
  onRewardShown,
  streak,
  rewardAt,
}: {
  scene: Scene;
  share: () => void;
  shareState: "idle" | "copied" | "failed";
  onBack: () => void;
  granted: RewardItem[];
  reduced: boolean;
  onRewardShown: (ids: string[]) => void;
  streak: StreakMoment | null;
  rewardAt: number;
}) {
  const { pairs } = bookEntry(scene);
  // 오늘 처음 이어졌으면 연속 기록을 먼저 보여주고, 새 물건은 그 뒤에 들어온다
  const streakShown = useRef(false);
  useEffect(() => {
    if (!streak || streakShown.current) return;
    streakShown.current = true;
    sfx.streak((STREAK_DELAY + 120) / 1000);
  }, [streak]);
  return (
    <div className="animate-[rise_240ms_ease-out]">
      <div className="flex items-end gap-3">
        <Mascot scale={3} className="shrink-0" />
        <div className="pb-1">
          <p className="font-pixel text-[15px] text-gold">장면 완료!</p>
          <p className="mt-1 font-pixel-title text-[24px] leading-[1.25] text-paper">{scene.title}</p>
        </div>
      </div>
      {/* 그 장면에서 발견한 것 하나가 완료 화면의 중심이다. 한 줄 정리와 모은 표현을 한 카드로 묶는다 */}
      <div className="blk-frame mt-5">
        <div className="blk bg-cream px-4 py-4 text-ink">
          <p className="text-[16px] font-semibold leading-relaxed">{scene.discovery}</p>
          <ul className="mt-3 space-y-3 border-t-2 border-dashed border-ink/20 pt-3">
            {pairs.map((p) => (
              <li key={p.right}>
                <p className="font-line text-[20px] leading-snug">{p.right}</p>
                <p className="text-[13px] text-ink-subtle">
                  {spoken(p.intent)} · <s>{p.wrong}</s>
                </p>
              </li>
            ))}
          </ul>
          <Link href="/expressions" className="-mx-1 mt-1 flex min-h-11 items-center gap-2 px-1 font-pixel text-[15px] text-ink-muted hover:text-ink">
            표현 모음에 담았어요
            <Arrow />
          </Link>
        </div>
      </div>

      {/* 연속 기록과 새 물건은 발견 뒤에 작게 덧붙인다 */}
      {(streak || granted.length > 0) && (
        <div className="mt-4 space-y-2">
          {streak && <StreakMomentCard current={streak.current} newBadge={streak.newBadge} reduced={reduced} delay={STREAK_DELAY} />}
          {granted.length > 0 && <RewardReveal items={granted} sceneTitle={scene.title} reduced={reduced} onShown={onRewardShown} after={rewardAt - STREAK_DELAY} />}
        </div>
      )}

      <div className="blk mt-5 flex items-center gap-3 bg-slate-block px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[15px] text-paper">친구는 맞힐까?</p>
          <p className="text-[13px] text-paper-subtle">이 장면을 문제로 보내 보세요</p>
        </div>
        <BlockButton primary onClick={share} className="shrink-0" faceClassName="font-pixel text-[15px]">
          {shareState === "copied" ? "복사됨" : shareState === "failed" ? "복사 실패" : "문제 내기"}
        </BlockButton>
      </div>

      <button type="button" onClick={onBack} className="-mx-1 mt-4 flex min-h-11 items-center gap-2 px-1 font-pixel text-[15px] text-paper-muted hover:text-paper">
        <span className="-scale-x-100">
          <Arrow />
        </span>
        다른 말 다시 보기
      </button>
    </div>
  );
}

// 대사 한 줄을 보여주는 시간. 자막까지 읽을 수 있게 길이에 맞춰 늘리고, 누르면 바로 넘어간다
const beatMs = (b: Beat) => Math.min(2800, 1300 + Math.max(b.line.length, b.meaning.length) * 30);

// 빌드업·이음 대사가 흐르는 동안 무대 아래에 쌓이는 대화 기록. 질문이 나오면 사라지고 지금의 질문 화면으로 돌아간다
function BeatLog({ beats, partnerName, onSkip }: { beats: Beat[]; partnerName: string; onSkip: () => void }) {
  const tag = "shrink-0 justify-self-start bg-ink px-1.5 py-1 font-pixel text-[13px] leading-none text-paper";
  return (
    <div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-2.5">
        {beats.map((b, i) => (
          <div key={i} className="col-span-2 grid animate-[rise_200ms_ease-out_both] grid-cols-subgrid items-baseline">
            <span className={tag}>{b.who === "me" ? "나" : b.who === "mochi" ? "Mochi" : partnerName}</span>
            <p className="min-w-0">
              <span className="block font-line text-[19px] leading-snug text-paper">{b.line}</span>
              <span className="block text-[13px] text-paper-subtle">{b.meaning}</span>
            </p>
          </div>
        ))}
      </div>
      <button type="button" onClick={onSkip} className="-mx-1 mt-3 flex min-h-11 items-center gap-2 px-1 font-pixel text-[15px] text-paper-muted hover:text-paper">
        건너뛰기
        <Arrow />
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
    if (e.type === "scene_completed") {
      markCleared(scene.id);
      void playStreak(scene.id);
    }
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

  useEffect(primeAudio, []);

  const f = useSceneFlow(scene, send);
  const look = useHeroLook();
  const rewards = useRewards();
  const granted = usePendingRewards(scene.id);
  const streakMoment = useStreakMoment(scene.id);
  const stats = usePickStats(scene.id, preview);
  const reduced = useReducedMotion();
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
  const lead = situation.lead ?? [];
  const [leadAt, setLeadAt] = useState({ base: 0, followUp: 0 });
  const leadIdx = leadAt[step];
  const leading = phase !== "transition" && !wrapped && leadIdx < lead.length;
  const beat = leading ? lead[leadIdx] : null;
  const nextBeat = () => setLeadAt((a) => ({ ...a, [step]: a[step] + 1 }));
  const skipLead = () => setLeadAt((a) => ({ ...a, [step]: lead.length }));
  useEffect(() => {
    if (!beat) return;
    const t = window.setTimeout(() => setLeadAt((a) => ({ ...a, [step]: a[step] + 1 })), beatMs(beat));
    return () => clearTimeout(t);
  }, [beat, step]);

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
    return { ...base, hero: look.hero, wear: JSON.parse(wearKey), flags: [...(base.flags ?? []), ...(stageChoice?.flags ?? [])] };
  }, [stageSituation, stageChoice, look.hero, wearKey]);

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
    <div className="flex min-h-dvh justify-center bg-night-deep break-keep text-ink">
      <main className="relative flex h-dvh w-full max-w-[480px] flex-col bg-night md:grid md:max-w-[1080px] md:grid-cols-[minmax(0,1fr)_400px] md:grid-rows-[auto_minmax(0,1fr)_auto] md:gap-x-10 md:px-8">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4 font-pixel text-[15px] md:col-span-2 md:h-16 md:px-0">
          <Link href={preview ? `/admin/scenes/${scene.id}` : "/"} className="-ml-2 flex h-11 items-center px-2">
            <span className="hl">{preview ? "검수" : "nuanci"}</span>
          </Link>
          <p className="min-w-0 truncate text-paper">{scene.title}</p>
          {/* 선택지 위 한 줄을 아끼려고 뜻 보기는 머리줄에 둔다. 고르는 동안에만 보인다 */}
          <div className="ml-auto flex shrink-0 items-center">
            {!choice && !wrapped && !leading && phase !== "transition" && (
              <button type="button" onClick={() => setShowMeaning((v) => !v)} aria-pressed={showMeaning} className="flex min-h-11 items-center px-2">
                <span className={`border-2 px-1.5 py-1 text-[13px] leading-none ${showMeaning ? "border-paper bg-paper text-night" : "border-paper-subtle text-paper-muted"}`}>{showMeaning ? "뜻 숨기기" : "뜻 보기"}</span>
              </button>
            )}
            <SoundToggle />
          </div>
        </header>

        <div ref={stageBox} onClick={leading ? nextBeat : undefined} className="shrink-0 px-4 md:row-span-2 md:px-0 md:pb-8">
          <Panel>
            <div className="relative aspect-[4/3] max-h-[36dvh] w-full overflow-hidden md:max-h-[calc(100dvh-8rem)]">
              <Stage
                spec={spec}
                reduced={reduced}
                state={{
                  meMotion: prizeOn ? "bounce" : celebrate ? "clap" : (stageChoice?.meMotion ?? stageSituation.meIdle?.motion),
                  meKey: prizeOn ? stageKey + 1000 : stageKey,
                  // 방에 둘 물건과 상자는 선물 상자를 들고 받는다
                  meProp: prizeOn && !tryOn ? "gift" : (stageChoice?.meProp ?? stageSituation.meIdle?.prop),
                  meNote: prizeOn ? <PrizeNote item={prize} /> : undefined,
                  meNoteKey: prize?.id,
                  partnerProp: stageChoice?.partnerProp ?? stageSituation.partnerIdle.prop,
                  partnerMotion: endingOn ? (partnerEnds && endingStep === "punch" ? (ending.motion ?? "idle") : "idle") : (stageChoice?.motion ?? stageSituation.partnerIdle.motion),
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
                  meTurn: phase !== "transition" && !choice && !beat,
                }}
              />
              {beat?.who === "mochi" && <MochiCameo step="punch" line={beat.line} />}
              {beat && <Subtitle key={`sub-${leadIdx}`} text={beat.meaning} />}
              {endingOn && ending.who === "mochi" && <MochiCameo step={endingStep} line={ending.line} />}
              {endingOn && endingStep === "punch" && <Subtitle text={ending.meaning} />}
              {later && !endingOn && !beat && (
                <p className="absolute bottom-2 left-2 animate-[fade-in_300ms] bg-ink px-2 py-1 font-pixel text-[15px] leading-none text-paper">
                  {timeCue ?? (
                    <>
                      <span className="text-gold">만약에</span> {scene.followUp.to}
                    </>
                  )}
                </p>
              )}
              {phase === "transition" && !reduced && <div className="pointer-events-none absolute inset-0 animate-[wipe_520ms_ease-in-out_both] bg-ink" />}
              {burst && !reduced && phase !== "transition" && (
                <span
                  key={`burst-${stageKey}`}
                  aria-hidden
                  className={`pointer-events-none absolute right-[7%] top-[9%] animate-[burst_950ms_steps(4,end)_70ms_both] font-pixel-title text-[24px] leading-none [text-shadow:2px_0_#fff,-2px_0_#fff,0_2px_#fff,0_-2px_#fff,2px_2px_#fff,-2px_-2px_#fff,2px_-2px_#fff,-2px_2px_#fff] ${burst.bad ? "text-rust" : "text-ink"}`}
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

        <section ref={scroller} className="scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-5 [mask-image:linear-gradient(to_bottom,transparent,#000_20px)] md:col-start-2 md:row-start-2 md:px-1 md:pt-0 md:[mask-image:none]">
          {phase === "transition" && timeCue ? (
            <p key="time" className="animate-[rise_220ms_ease-out] pt-6 text-center font-pixel-title text-[28px] text-paper">
              {timeCue}…
            </p>
          ) : phase === "transition" ? (
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
              <p className="mb-3 text-[14px] leading-normal text-paper-muted">{situation.context}</p>
              <BeatLog beats={lead.slice(0, leadIdx + 1)} partnerName={scene.partnerName} onSkip={skipLead} />
            </div>
          ) : !choice ? (
            // 상대가 한 말을 먼저 띄우고 선택지는 조금 늦게 올려서, 탭을 늘리지 않고도 눈이 질문 → 선택지 순서로 가게 한다.
            // 고르는 동안 질문이 계속 보이고, 작은 폰(375×667)에서도 선택지 세 개가 스크롤 없이 들어오게 높이를 맞춘다
            <div key={`ask-${phase}`}>
              <p className="text-[14px] leading-normal text-paper-muted">{situation.context}</p>
              <Question name={scene.partnerName} line={situation.partnerLine} intent={situation.intent} className="mt-2.5 animate-[rise_220ms_ease-out_both]" />
              <ul className="mt-3.5 space-y-2.5">
                {situation.choices.map((c, i) => (
                  <li key={c.id} className="animate-[rise_220ms_ease-out_both]" style={{ animationDelay: `${300 + i * 60}ms` }}>
                    <BlockButton onClick={() => play(c)} className="w-full text-left" faceClassName="flex items-center gap-3">
                      <Num n={i + 1} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-line text-[20px] leading-snug">{c.line}</span>
                        {showMeaning && <span className="mt-0.5 block text-[14px] text-ink-subtle">{c.meaning}</span>}
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
              <p className="mt-4 font-pixel text-[15px] text-paper-subtle">다른 말도 눌러 보세요</p>
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
                              {detailOpen && <span className="mt-2 block animate-[fade-in_150ms] text-[16px] leading-relaxed text-paper-muted">{c.detail}</span>}
                              <button
                                type="button"
                                onClick={() => setDetailOpen((v) => !v)}
                                aria-expanded={detailOpen}
                                className="-mx-1 -mb-2 flex min-h-11 items-center gap-2 px-1 font-pixel text-[15px] text-paper-muted hover:text-paper"
                              >
                                <Caret open={detailOpen} />
                                {detailOpen ? "접기" : "왜 그런지 더 보기"}
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

        {(choice || (phase === "transition" && !timeCue)) && (
          <footer className="shrink-0 border-t-[3px] border-night-deep px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:col-start-2 md:row-start-3 md:px-1 md:pb-8">
            {phase === "transition" ? (
              <BlockButton primary onClick={f.enterFollowUp} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
                이번엔 뭐라고 할까?
              </BlockButton>
            ) : f.done && preview ? (
              <BlockLink href={`/admin/scenes/${scene.id}`}>편집 화면으로</BlockLink>
            ) : f.done && !wrapped ? (
              <BlockButton primary onClick={wrapUp} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
                다 봤어요
              </BlockButton>
            ) : f.done ? (
              next ? (
                <BlockLink href={`/scenes/${next.number}`} entry="next" primary onClick={goNext}>
                  다음 장면
                </BlockLink>
              ) : (
                <BlockLink href="/" primary onClick={holdForEnding}>
                  모두 해 봤어요
                </BlockLink>
              )
            ) : (
              <BlockButton primary onClick={() => (sfx.whoosh(), f.startTransition())} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
                {timeCue ? "이어서 보기" : "만약에 상황이 바뀐다면?"}
              </BlockButton>
            )}
          </footer>
        )}
      </main>
    </div>
  );
}
