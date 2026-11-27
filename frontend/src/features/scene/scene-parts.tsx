"use client";

import { useEffect, useState } from "react";
import { Mascot } from "@/features/mascot/mascot";
import { SpeakerTag } from "./block-ui";
import { ReactionFace } from "./reaction-face";
import { sfx, toggleSound, useSoundEnabled } from "./sfx";
import { TRAP_LABELS, type Choice, type Expression } from "./types";
import { BoldQuoted } from "./emphasis";
import { heardAs, Num, VerdictNote, VerdictStamp } from "./verdict";
import { WaitDots } from "./run-ui";

// 검수 미리보기에서만 보이는 함정 유형 표시
export function TrapChip({ choice }: { choice: Choice }) {
  return <span className="shrink-0 border-2 border-current px-1 py-0.5 font-label-strong text-meta leading-none opacity-80">{choice.trap ? TRAP_LABELS[choice.trap] : "자연스러움"}</span>;
}

// 상대 반응 위로 튀어나오는 만화 효과음 글자
export const BURSTS: Record<Expression, { text: string; bad: boolean }> = {
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

export function SoundToggle() {
  const on = useSoundEnabled();
  return (
    <button type="button" onClick={toggleSound} aria-pressed={on} aria-label={on ? "소리 끄기" : "소리 켜기"} className="-mr-2 ml-auto grid size-11 shrink-0 place-items-center text-fg-muted hover:text-fg">
      <svg width="20" height="20" viewBox="0 0 10 10" shapeRendering="crispEdges" fill="currentColor" aria-hidden>
        <path d="M1 3h2v4H1zM3 3h1V2h1V1h1v8H5V8H4V7H3z" />
        {on ? <path d="M7 3h1v4H7zM8 2h1v1H8zM8 7h1v1H8zM9 3h1v4H9z" /> : <path d="M7 3h1v1H7zM9 3h1v1H9zM8 4h1v2H8zM7 6h1v1H7zM9 6h1v1H9z" />}
      </svg>
    </button>
  );
}

// 이 장면의 질문: 상대가 한 말과 내가 하고 싶은 말. 무대 말풍선은 작아서 상대 말을 여기서 가장 크게 다시 보여주고, 내 마음은 한 단계 작게 둔다
export function Question({ name, line, intent, className = "" }: { name: string; line: string; intent: string; className?: string }) {
  return (
    <div className={`grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-2 ${className}`}>
      {/* 상대 대사는 대본처럼 굵은 세로줄로, 내 속마음은 점선 칸으로 둬서 "들은 영어"와 "머릿속 한국어"가 바로 갈린다 */}
      <SpeakerTag>{name}</SpeakerTag>
      <p className="border-l-[3px] border-fg pl-3 font-line text-say leading-snug text-fg md:text-display-sm">{line}</p>
      <SpeakerTag me>나</SpeakerTag>
      <p className="justify-self-start border border-dashed border-fg-subtle px-2.5 py-1.5 text-body font-semibold leading-snug text-fg">{intent}</p>
    </div>
  );
}

// Mochi가 옆에서 말을 거는 한 줄. 반말 안내가 서비스 말투가 아니라 고양이 말로 들리게 한다(메뉴의 "어디로 갈까?"와 같은 모양).
// 말풍선 글자는 도트 제목 글꼴이라 안내문이 아니라 게임 속 캐릭터 대사로 읽힌다
export function MochiAsk({ children, className = "", cheer = 0, cheerTwice = false }: { children: React.ReactNode; className?: string; cheer?: number; cheerTwice?: boolean }) {
  const [hop, setHop] = useState(0);
  // cheer가 오를 때마다(다른 반응을 하나 더 들었을 때) 한 번, 다 모았을 때는 두 번 뛴다. 눌렀을 때와 같은 동작이라 새 그림 없이 곁반응이 된다
  const [lastCheer, setLastCheer] = useState(cheer);
  if (cheer !== lastCheer) {
    setLastCheer(cheer);
    if (cheer > lastCheer) setHop((n) => n + 1);
  }
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      {/* 누르면 제자리에서 콩 뛴다. 그냥 장식이지만 눌러 보는 사람에게 작은 대답이 된다 */}
      <button type="button" aria-label="Mochi 쓰다듬기" onClick={() => (setHop((n) => n + 1), sfx.poke("partner"))} className="-m-1 shrink-0 p-1">
        <Mascot key={hop} scale={2} className={`origin-bottom ${hop ? (cheerTwice ? "animate-mochi-hop-twice" : "animate-mochi-hop") : ""}`} />
      </button>
      <div className="blk-frame-sm mb-2 min-w-0">
        <p className="blk bg-white px-2.5 py-1.5 font-poster text-body leading-snug text-ink-fixed">{children}</p>
      </div>
    </div>
  );
}

export function Caret({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className={`fill-current transition-transform ${open ? "rotate-90" : ""}`}>
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}

// 결과 목록의 한 줄. 대사와 상대 반응을 함께 보여주고, 지금 무대에 올린 줄은 어둡게 강조한다
// 아직 무대에서 들어 보지 않은 답은 반응을 가려 두고, 눌렀을 때 캐릭터 연출과 함께 보여준다
// retry: 아직 통하는 말을 못 찾은 동안에는 나머지 보기가 '구경할 반응'이 아니라 '다시 할 말'이다
export function HiddenReaction({ retry = false }: { retry?: boolean }) {
  return (
    <span className="mt-1.5 flex items-center gap-2 text-note leading-snug text-ink-subtle">
      <span className="grid size-[18px] shrink-0 place-items-center border-2 border-ink-subtle font-label text-ui leading-none">?</span>
      {retry ? "이렇게 말해 보기" : "반응 보기"}
    </span>
  );
}

// 표본이 적으면 비율이 들쭉날쭉해서 이만큼 모이기 전엔 보여주지 않는다
export const MIN_PICKS = 20;

export type StepPicks = { total: number; picks: Record<string, number> };
export type PickStats = { base: StepPicks; followUp: StepPicks };

// 사람들이 첫 답으로 무엇을 골랐는지 불러온다. 실패하면 비율 없이 진행한다
export function usePickStats(sceneId: string, preview: boolean) {
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


export function ResultBody({
  choice,
  n,
  mine,
  active,
  showTrap,
  showMeaning = false,
  revealed,
  verdictKey,
  share,
  meta = true,
  waiting = false,
  partnerName,
  friend = false,
  reduced = false,
  retry = false,
  whyDelay = 0,
}: {
  // 아직 통하는 말을 못 찾았을 때 나머지 보기의 안내를 '이렇게 말해 보기'로 바꾼다
  retry?: boolean;
  // 해설(왜 그렇게 들리나)을 도장보다 이만큼(ms) 늦게 띄운다. 도장과 해설이 한꺼번에 뜨면 궁금해하기 전에 답이 다 나와 그 자리에서 끝난 것처럼 읽힌다
  whyDelay?: number;
  // 문제를 낸 친구가 처음 고른 보기. 아직 안 들어 본 보기여도 표시해서 눌러 보게 한다
  friend?: boolean;
  // 지금 펼친 카드에서 "하고 싶던 말 → 들린 느낌" 줄을 만드는 데 쓴다
  intent?: string;
  // 무대에서 상대가 아직 반응하기 전. 반응·인상·해설을 비워 두고 무대에 눈이 가게 한다. 반응이 뜨면 인상과 해설은 한 박자 뒤에 온다
  waiting?: boolean;
  partnerName?: string;
  // 지금 펼친 카드는 내 선택·고른 비율을 맨 아래 줄로 옮기므로 여기서는 그리지 않는다
  meta?: boolean;
  choice: Choice;
  n: number;
  mine: boolean;
  active: boolean;
  showTrap: boolean;
  showMeaning?: boolean;
  revealed: boolean;
  verdictKey?: number;
  share?: number;
  reduced?: boolean;
}) {
  // 반응은 무대가 먼저 보여 줬으니 도장은 카드가 채워지는 순간 찍고, 해설만 조금 뒤에 온다
  // 카드는 결과만 맡는다(대화극은 무대가 맡는다): 고른 영어 → 하려던 말과 들린 느낌 도장 → 판정 한 줄. 해설·겉말 영어·고른 비율은 '왜 그런지 더 보기'에
  const heardAt = 0;
  return (
    <span className="flex items-start gap-3">
      <Num n={n} dark={active} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 flex-1">
            <span className="block font-line text-say leading-snug">{choice.line}</span>
            {showMeaning && choice.meaning && <span className="mt-0.5 block text-note text-ink-subtle">{choice.meaning}</span>}
          </span>
          {showTrap && (
            <span className="shrink-0 pt-1">
              <TrapChip choice={choice} />
            </span>
          )}
        </span>
        {/* 반응을 기다리는 동안 카드가 비어 보이지 않게, 무대에서 일어나는 일을 카드에도 차례로 적는다: 듣는 중 → 상대가 한 영어 → (속마음과 도장) */}
        {active && waiting && (
          <span className="mt-2 flex items-center gap-2 text-note text-ink-subtle">
            <span className="shrink-0">{`${partnerName || "상대"} 듣는 중`}</span>
            <WaitDots reduced={reduced} />
          </span>
        )}
        {active ? null : revealed ? (
          <span key={verdictKey} className="mt-1 flex items-start gap-2 text-note leading-[1.5] text-ink-muted">
            <span className="mt-px">
              <ReactionFace expression={choice.expression} size={18} />
            </span>
            {choice.reaction}
          </span>
        ) : (
          <HiddenReaction retry={retry} />
        )}
        {/* 지금 고른 말의 주인공: 이 영어가 어떻게 들렸나(도장) → 왜 그렇게 들리나(영어권의 문화·언어적 이유). 판정은 도장 옆에 작게.
            한국어 '하려던 말'은 고르기 전에 이미 보였으니 여기서 다시 주인공으로 세우지 않는다(한국어 문장이 그렇게 들린 것처럼 읽혔다) */}
        {active && !waiting && (
          <span key={`heard-${verdictKey}`} className="mt-3 block animate-fade" style={{ animationDelay: `${heardAt}ms` }}>
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <VerdictStamp choice={choice} pop={!reduced} delay={heardAt} />
              <VerdictNote choice={choice} />
            </span>
            {choice.why && <LateWhy text={choice.why} delay={whyDelay} reduced={reduced} />}
          </span>
        )}
        {!active && revealed && <span className="mt-1 block text-meta text-ink-subtle">→ {heardAs(choice)}</span>}
        {meta && (friend || (revealed && (mine || (share ?? 0) > 0))) && <PickMeta mine={mine} friend={friend} share={revealed ? share : undefined} className="mt-1.5" />}
      </span>
    </span>
  );
}


// 해설(왜 그렇게 들리나)을 도장보다 늦게 띄운다. 기다리는 동안 자리를 비워 두지 않고 "왜 그렇게 들렸냐면"과 점 셋을 먼저 둔다.
// 빈 칸은 끝난 화면처럼 읽히고, 이 줄은 아직 나올 것이 있다는 것과 '왜?'라는 물음을 같이 남긴다. 기다리기 싫으면 누르면 바로 채워진다.
// 해설 글은 처음부터 자리를 잡고 있어(보이지만 않는다) 나타날 때 아래 보기들이 밀리지 않는다
function LateWhy({ text, delay, reduced }: { text: string; delay: number; reduced: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
  const shown = ready || delay <= 0;
  return (
    <span className="relative mt-2.5 block text-ui leading-[1.6] text-ink-muted">
      <span className={shown ? (delay > 0 ? "block animate-fade" : "block") : "invisible block"} aria-hidden={!shown || undefined}>
        <BoldQuoted text={text} />
      </span>
      {!shown && (
        <button type="button" onClick={() => setReady(true)} className="absolute inset-0 flex items-start gap-2 text-left text-note text-ink-subtle">
          <span className="shrink-0">왜 그렇게 들렸냐면</span>
          <span className="mt-2">
            <WaitDots reduced={reduced} />
          </span>
        </button>
      )}
    </span>
  );
}

// 내가 고른 보기인지, 첫 답으로 몇 %가 골랐는지. 본문보다 두 단계 작고 흐리게 둔다
export function PickMeta({ mine, friend = false, share, className = "" }: { mine: boolean; friend?: boolean; share?: number; className?: string }) {
  return (
    <span className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-meta tabular-nums text-ink-subtle ${className}`}>
      {mine && <span className="border border-ink/25 px-1 py-px font-semibold text-ink-muted">내 선택</span>}
      {friend && <span className="border border-ink px-1 py-px font-semibold text-ink">친구 선택</span>}
      {/* 0%는 새로 넣어 아직 아무도 못 본 보기일 수 있어서 적지 않는다 */}
      {share !== undefined && share > 0 && <span>첫 답으로 {share}%가 골랐어요</span>}
    </span>
  );
}

export function Arrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="fill-current">
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}
