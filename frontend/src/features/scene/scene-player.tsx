"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useEffect, useMemo, useRef, useState } from "react";
import { bookEntry, spoken } from "@/features/collection/pairs";
import { useInquiry } from "@/features/inquiry/inquiry-form";
import { logoSvg, wordmarkSvg } from "@/features/site/logo";
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
import { BlockButton, BlockLink, Panel, SpeakerTag } from "./block-ui";
import { shuffleChoices } from "./choice-order";
import { BEAT_AT, MochiCameo, PUNCH_AT, PUNCH_HOLD, Subtitle, type EndingStep } from "./ending";
import { ImagineBubble } from "./imagine-bubble";
import { ReactionFace } from "./reaction-face";
import { primeAudio, sfx, toggleSound, useSoundEnabled } from "./sfx";
import { useTranslationOn } from "./translation";
import { TRAP_LABELS, type Beat, type Choice, type Expression, type Scene } from "./types";
import { Num, VERDICTS, VerdictStamp } from "./verdict";
import { markCleared, nextScene } from "./progress";
import { markPlayed, SHARE_PARAM, takeEntry, track, uuid, watchEngagement, type TrackEvent } from "./track";
import { useReducedMotion, useSceneFlow, useShare } from "./use-scene-flow";

preloadStage();

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
  return (
    <div className={`grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-2 ${className}`}>
      {/* 상대 대사는 대본처럼 굵은 세로줄로, 내 속마음은 점선 칸으로 둬서 "들은 영어"와 "머릿속 한국어"가 바로 갈린다 */}
      <SpeakerTag>{name}</SpeakerTag>
      <p className="border-l-[3px] border-paper pl-3 font-line text-[20px] leading-snug text-paper md:text-[24px]">{line}</p>
      <SpeakerTag me>나</SpeakerTag>
      <p className="justify-self-start border border-dashed border-paper-subtle px-2.5 py-1.5 text-[16px] font-semibold leading-snug text-paper">{intent}</p>
    </div>
  );
}

// Mochi가 옆에서 말을 거는 한 줄. 반말 안내가 서비스 말투가 아니라 고양이 말로 들리게 한다(메뉴의 "어디로 갈까?"와 같은 모양)
function MochiAsk({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [hop, setHop] = useState(0);
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      {/* 누르면 제자리에서 콩 뛴다. 그냥 장식이지만 눌러 보는 사람에게 작은 대답이 된다 */}
      <button type="button" aria-label="Mochi 쓰다듬기" onClick={() => (setHop((n) => n + 1), sfx.tap())} className="-m-1 shrink-0 p-1">
        <Mascot key={hop} scale={2} className={hop ? "animate-[hop_380ms_steps(3,end)]" : ""} />
      </button>
      <div className="blk-frame-sm mb-2 min-w-0">
        <p className="blk bg-white px-2.5 py-1.5 text-[14px] font-bold leading-snug text-[#0b1a44]">{children}</p>
      </div>
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
      <span className="grid size-[18px] shrink-0 place-items-center border-2 border-ink-subtle font-pixel text-[15px] leading-none">?</span>
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
  meta = true,
}: {
  // 지금 펼친 카드는 내 선택·고른 비율을 맨 아래 줄로 옮기므로 여기서는 그리지 않는다
  meta?: boolean;
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
          <span key={verdictKey} className={`flex items-start gap-2 leading-[1.5] ${active ? "mt-1.5 animate-[rise_240ms_var(--ease-snap)_420ms_both] text-[16px] font-bold text-ink" : "mt-1 text-[14px] text-ink-muted"}`}>
            <span className="mt-px">
              <ReactionFace expression={choice.expression} size={18} />
            </span>
            {choice.reaction}
          </span>
        ) : (
          <HiddenReaction />
        )}
        {/* 대사+반응을 한 덩어리로 진하게 묶고, 이유는 한 칸 떼어 한 톤 낮춘다 */}
        {active && <span key={`why-${verdictKey}`} className="mt-3 block animate-[fade-in_240ms_ease-out_680ms_both] text-[15px] leading-[1.6] text-ink-muted">{choice.why}</span>}
        {meta && revealed && (mine || share !== undefined) && <PickMeta mine={mine} share={share} className="mt-1.5" />}
      </span>
    </span>
  );
}

// 내가 고른 보기인지, 첫 답으로 몇 %가 골랐는지. 본문보다 두 단계 작고 흐리게 둔다
function PickMeta({ mine, share, className = "" }: { mine: boolean; share?: number; className?: string }) {
  return (
    <span className={`flex flex-wrap items-center gap-x-1.5 text-[12px] tabular-nums text-ink-subtle ${className}`}>
      {mine && <span className="border border-ink/25 px-1 py-px font-semibold text-ink-muted">내 선택</span>}
      {share !== undefined && <span>첫 답으로 {share}%가 골랐어요</span>}
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

// 고른 말을 들은 상대가 무대에서 반응을 말하기까지의 시간. 생각 말풍선은 650ms에 떠서 3050ms에 사라진다
const REACT_AFTER = 1100;
const REACT_AFTER_IMAGINE = 3100;

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
  const { open: openInquiry, element: inquiry } = useInquiry();
  // 오늘 처음 이어졌으면 연속 기록을 먼저 보여주고, 새 물건은 그 뒤에 들어온다
  const streakShown = useRef(false);
  useEffect(() => {
    if (!streak || streakShown.current) return;
    streakShown.current = true;
    sfx.streak((STREAK_DELAY + 120) / 1000);
  }, [streak]);
  return (
    <div className="animate-[rise_240ms_var(--ease-snap)]">
      <div className="flex items-end gap-3">
        <Mascot scale={3} className="shrink-0" />
        <div className="pb-1">
          <p className="font-pixel text-[15px] text-paper-muted">장면 완료!</p>
          <p className="mt-1 font-poster text-[24px] leading-[1.25] text-paper">{scene.title}</p>
        </div>
      </div>
      {/* 그 장면에서 발견한 것 하나가 완료 화면의 중심이다. 한 줄 정리와 모은 표현을 한 카드로 묶는다 */}
      <div className="blk-frame mt-5">
        <div className="blk bg-cream px-4 py-4 text-ink">
          <p className="text-[15px] leading-[1.6]">{scene.discovery}</p>
          <ul className="mt-3.5 space-y-3.5 border-t-2 border-dashed border-ink/20 pt-3">
            {pairs.map((p) => (
              <li key={p.right}>
                <p className="font-line text-[20px] leading-snug">{p.right}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-subtle">
                  {spoken(p.intent)} · <s className="decoration-rust decoration-2">{p.wrong}</s>
                </p>
              </li>
            ))}
          </ul>
          <Link href="/expressions" className="-mx-1 mt-2 flex min-h-11 items-center gap-2 px-1 text-[13px] text-ink-subtle hover:text-ink">
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
          <p className="text-[14px] text-paper-subtle">이 장면을 문제로 보내 보세요</p>
        </div>
        <BlockButton onClick={share} className="shrink-0" faceClassName="font-pixel text-[15px] text-ink">
          {shareState === "copied" ? "복사됨" : shareState === "failed" ? "복사 실패" : "문제 내기"}
        </BlockButton>
      </div>

      <button type="button" onClick={onBack} className="-mx-1 mt-4 flex min-h-11 items-center gap-2 px-1 font-pixel text-[15px] text-paper-muted hover:text-paper">
        <span className="-scale-x-100">
          <Arrow />
        </span>
        다른 말 다시 보기
      </button>
      {/* 판정이나 영어가 이상하면 그 장면에서 바로 알린다. 문의 창이 보던 장면 주소를 함께 보낸다 */}
      <button type="button" onClick={() => openInquiry("scene")} className="-mx-1 flex min-h-11 items-center px-1 text-[14px] text-paper-subtle underline underline-offset-4 hover:text-paper">
        이 장면의 영어가 이상해요
      </button>
      {inquiry}
    </div>
  );
}

// 대사 한 줄을 보여주는 시간. 영어 한 줄과 뜻을 읽을 수 있게 2~4초, 다 읽었으면 눌러서 바로 넘긴다
// 한 줄에 2~4.5초. 속도를 늦추면 모두가 느려져서, 놓친 줄은 질문 화면의 "앞 대화 다시 보기"가 맡는다.
// 한국어 뜻은 영어보다 글자당 조금 더 오래 읽는다고 봐서, 상황 설명처럼 뜻이 긴 줄만 그만큼 더 머문다
const beatMs = (b: Beat) => Math.min(4500, Math.max(2000, 1400 + Math.max(b.line.length * 45, b.meaning.length * 55)));

// 대사가 몇 줄 남았는지 보여주는 점
function BeatDots({ total, at }: { total: number; at: number }) {
  return (
    <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`size-1.5 ${i <= at ? "bg-ink" : "bg-ink/25"}`} />
      ))}
    </div>
  );
}

// 빌드업·이음 대사가 흐르는 동안 무대 아래에 쌓이는 대화 기록. 질문이 나오면 사라지고 지금의 질문 화면으로 돌아간다
// 번역은 영어 줄 아래에 작고 흐리게 같이 띄워서, 눈을 여러 번 옮기지 않고도 영어가 먼저 읽히게 한다. 상황 묘사("……")는 번역이 아니라서 번역을 꺼도 보인다
function BeatLog({ beats, partnerName, translate }: { beats: Beat[]; partnerName: string; translate: boolean }) {
  return (
    <div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-2.5">
        {beats.map((b, i) => (
          <div key={i} className={`col-span-2 grid animate-[rise_200ms_var(--ease-snap)_both] grid-cols-subgrid items-baseline ${i < beats.length - 1 ? "beat-past" : ""}`}>
            <SpeakerTag me={b.who === "me"}>{b.who === "me" ? "나" : b.who === "mochi" ? "Mochi" : partnerName}</SpeakerTag>
            {b.line === "……" ? (
              <p className="min-w-0 text-[16px] leading-snug text-paper-muted">{b.meaning}</p>
            ) : (
              <p className="min-w-0">
                <span className="block font-line text-[20px] leading-snug text-paper">{b.line}</span>
                {translate && <span className="mt-0.5 block text-[14px] leading-snug text-paper-muted">{b.meaning}</span>}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 질문이 나오면 빌드업 대사가 사라져서, 잠깐 한눈판 사람은 무슨 일이 있었는지 모른 채 골라야 했다. 접어 둔 채로 다시 펼쳐 볼 수 있게 남긴다
function LeadRecap({ beats, partnerName, translate }: { beats: Beat[]; partnerName: string; translate: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="-mx-1 flex min-h-9 items-center gap-1.5 px-1 text-[13px] text-paper-subtle underline decoration-paper-subtle/40 underline-offset-4 hover:text-paper">
        {open ? "앞 대화 접기" : "앞 대화 다시 보기"}
        <Caret open={open} />
      </button>
      {open && (
        <div className="mb-2 mt-1 animate-[fade-in_150ms] border-l-2 border-line pl-3">
          <BeatLog beats={beats} partnerName={partnerName} translate={translate} />
        </div>
      )}
    </div>
  );
}

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
    <div className="flex min-h-dvh justify-center overflow-x-clip bg-night break-keep text-ink">
      {/* 데스크톱은 전체 높이를 820px까지 쓰고 세로 가운데에 둔다. 오른쪽 선택 영역이 무대 높이에 묶이지 않아 보기와 결과 카드가 잘리지 않는다 */}
      <main className="relative flex h-dvh w-full max-w-[480px] flex-col bg-night md:grid md:max-w-[1200px] md:grid-cols-[minmax(0,1fr)_minmax(480px,1.1fr)] lg:max-w-[1360px] lg:grid-cols-[minmax(0,1.3fr)_minmax(440px,1fr)] md:grid-rows-[auto_minmax(0,max-content)] md:content-start md:gap-x-10 md:px-8">
        {/* 모바일은 머리줄과 무대를 검은 띠로 묶고, 데스크톱은 다른 화면처럼 머리줄만 화면 너비로 검게 둔다 */}
        <div className="shrink-0 md:contents">
        <header className="relative isolate flex h-14 shrink-0 items-center gap-2 bg-ink px-4 font-pixel text-[15px] text-paper md:col-span-2 md:h-16 md:bg-transparent md:px-0 md:before:absolute md:before:inset-y-0 md:before:left-1/2 md:before:-z-10 md:before:w-screen md:before:-translate-x-1/2 md:before:bg-ink">
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
          <h1 className="min-w-0 truncate text-paper">{scene.title}</h1>
          {/* 선택지 위 한 줄을 아끼려고 뜻 보기는 머리줄에 둔다. 고르는 동안에만 보인다 */}
          <div className="ml-auto flex shrink-0 items-center">
            {!choice && !wrapped && !leading && phase !== "transition" && (
              <button type="button" onClick={() => setShowMeaning((v) => !v)} aria-pressed={showMeaning} className="flex min-h-11 items-center px-2">
                <span className={`border-2 px-1.5 py-1 text-[14px] leading-none ${showMeaning ? "border-paper bg-paper text-night" : "border-paper-subtle text-paper-muted"}`}>{showMeaning ? "뜻 숨기기" : "뜻 보기"}</span>
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
                <p className="absolute bottom-2 left-2 animate-[fade-in_300ms] bg-ink px-2 py-1 font-pixel text-[15px] leading-none text-paper">
                  {timeCue ?? (
                    <>
                      <span className="font-bold">만약에</span> {scene.followUp.to}
                    </>
                  )}
                </p>
              )}
              {phase === "transition" && !reduced && <div className="pointer-events-none absolute inset-0 animate-[wipe_520ms_ease-in-out_both] bg-ink" />}
              {burst && !reduced && phase !== "transition" && (
                <span
                  key={`burst-${stageKey}`}
                  aria-hidden
                  className={`pointer-events-none absolute right-[7%] top-[9%] animate-[burst_950ms_steps(4,end)_70ms_both] font-poster text-[24px] leading-none [text-shadow:2px_0_#fff,-2px_0_#fff,0_2px_#fff,0_-2px_#fff,2px_2px_#fff,-2px_-2px_#fff,2px_-2px_#fff,-2px_2px_#fff] ${burst.bad ? "text-rust" : "text-ink"}`}
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
        <section ref={scroller} className="scroll-area min-h-0 flex-1 md:px-1 md:pt-6 md:[mask-image:linear-gradient(to_bottom,#000_calc(100%-32px),transparent)] overflow-y-auto overflow-x-hidden px-4 pb-6 pt-5 [mask-image:linear-gradient(to_bottom,transparent,#000_20px)] md:flex-initial">
          {phase === "transition" && timeCue ? (
            <p key="time" className="animate-[rise_220ms_var(--ease-snap)] pt-6 text-center font-poster text-[24px] text-paper">
              {timeCue}…
            </p>
          ) : phase === "transition" ? (
            <Panel key="transition" className="animate-[rise_220ms_var(--ease-snap)]">
              <div className="p-5">
                <p className="font-pixel text-[15px] text-rust">만약에…</p>
                <p className="mt-1.5 text-[20px] font-semibold leading-snug">{scene.followUp.prompt.replace(/^잠깐,\s*/, "")}</p>
                <p className="mt-3 text-[14px] text-ink-subtle">
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
              <p className="mb-3 text-[14px] leading-normal text-paper-muted">{situation.context}</p>
              <BeatLog beats={lead.slice(0, leadIdx + 1)} partnerName={scene.partnerName} translate={translate} />
            </div>
          ) : !choice ? (
            // 상대가 한 말을 먼저 띄우고 선택지는 조금 늦게 올려서, 탭을 늘리지 않고도 눈이 질문 → 선택지 순서로 가게 한다.
            // 고르는 동안 질문이 계속 보이고, 작은 폰(375×667)에서도 선택지 세 개가 스크롤 없이 들어오게 높이를 맞춘다
            <div key={`ask-${phase}`}>
              <p className="text-[14px] leading-normal text-paper-muted">{situation.context}</p>
              {lead.length > 0 && <LeadRecap beats={lead} partnerName={scene.partnerName} translate={translate} />}
              <Question name={scene.partnerName} line={situation.partnerLine} intent={situation.intent} className="mt-2.5 animate-[rise_220ms_var(--ease-snap)_both]" />
              {/* 대사를 영상처럼 보던 사람도 지금 고를 차례라는 걸 알게, 메뉴처럼 Mochi가 말풍선으로 묻는다 */}
              <MochiAsk className="mt-3 animate-[rise_220ms_var(--ease-snap)_both] [animation-delay:200ms]">너라면 뭐라고 할래?</MochiAsk>
              <ul className="mt-2 space-y-2.5">
                {situation.choices.map((c, i) => (
                  <li key={c.id} className="animate-[rise_220ms_var(--ease-snap)_both]" style={{ animationDelay: `${300 + i * 60}ms` }}>
                    <BlockButton onClick={() => play(c)} className="group w-full text-left" faceClassName="flex items-center gap-3">
                      <Num n={i + 1} hover />
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
              {/* 다른 보기의 반응을 비교해 보는 게 이 화면에서 배우는 방법이라, 고를 때처럼 Mochi가 권한다 */}
              <MochiAsk className="mt-3">다른 말도 눌러 볼래?</MochiAsk>
              <ul className="mt-3 space-y-3">
                {situation.choices.map((c, i) => (
                  <li key={c.id} className="animate-[rise_240ms_var(--ease-snap)_both]" style={{ animationDelay: `${i * 70}ms` }}>
                    {c.id === choice.id ? (
                      <Panel className="blk-strong">
                        <div className="relative overflow-hidden px-3.5 pb-1 pt-3.5" aria-current="true">
                          {/* 판정 색을 옅게 깔아 두고, 방금 고른 순간에만 진하게 한 번 번쩍인다 */}
                          <span aria-hidden className={`pointer-events-none absolute inset-0 opacity-15 ${VERDICTS[c.verdict].color}`} />
                          {!reduced && (
                            <span key={`tint-${f.reactionKey}`} aria-hidden className={`pointer-events-none absolute inset-0 animate-[tint_400ms_ease-out_both] ${VERDICTS[c.verdict].color}`} />
                          )}
                          <span className="relative block">
                            <ResultBody choice={c} n={i + 1} mine={c.id === pickedId} active showTrap={preview} revealed verdictKey={f.reactionKey} share={shareOf(c)} meta={false} />
                            {/* 더 보기와 메타는 카드 맨 아래 한 줄의 양 끝에 두고 힘을 뺀다 */}
                            <span className="mt-3.5 block border-t border-ink/10 pl-9">
                              {detailOpen && <span className="mt-3 block animate-[fade-in_150ms] text-[15px] leading-[1.6] text-ink-muted">{c.detail}</span>}
                              <span className="flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => setDetailOpen((v) => !v)}
                                  aria-expanded={detailOpen}
                                  className="-mx-1 flex min-h-11 items-center gap-1.5 px-1 text-[13px] text-ink-subtle underline decoration-ink/25 underline-offset-4 hover:text-ink hover:decoration-ink"
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
                <p className="mt-3 text-[12px] leading-relaxed text-paper-subtle">출처 · {situation.sources.map((s) => `${s.phrase} — ${s.from}`).join(" · ")}</p>
              )}
              {f.done && preview && (
                <div className="blk mt-6 bg-night-deep px-4 py-3">
                  <p className="font-pixel text-[15px] text-paper-subtle">한 줄 정리</p>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-paper">{scene.discovery}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {(choice || leading || (phase === "transition" && !timeCue)) && (
          <footer className="relative shrink-0 border-t border-line/40 bg-night px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:col-start-2 md:row-start-3 md:mt-auto md:px-1 md:pb-8">
            {/* 대사가 저절로 넘어간다는 걸 알 수 있게 위 테두리를 남은 시간만큼 채운다 */}
            {beat && !reduced && !autoPaused && (
              <span
                key={`fill-${step}-${leadIdx}`}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-[3px] h-[3px] origin-left bg-gold"
                style={{ animation: `fill ${beatMs(beat)}ms linear both` }}
              />
            )}
            {leading ? (
              // 대사는 저절로 넘어가고, 메인 버튼(과 무대)을 누르면 바로 다음 줄로, 이미 본 장면이면 옆의 건너뛰기로 바로 질문에 간다
              <div className="flex items-center gap-2">
                {/* 대사는 저절로 넘어가니 "다음"은 재촉하는 보조 버튼이다. 대사보다 눈에 띄지 않게 흰 칸으로 둔다 */}
                <BlockButton onClick={nextBeat} reading className="flex-1" faceClassName="py-3 text-center text-[16px] font-bold">
                  다음
                </BlockButton>
                <button type="button" onClick={() => setAutoPaused((v) => !v)} aria-pressed={autoPaused} className="min-h-11 shrink-0 px-2 font-pixel text-[15px] text-paper-muted hover:text-paper">
                  {autoPaused ? "자동 켜기" : "자동 멈춤"}
                </button>
                <button type="button" onClick={skipLead} className="min-h-11 shrink-0 px-3 font-pixel text-[15px] text-paper-muted hover:text-paper">
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
