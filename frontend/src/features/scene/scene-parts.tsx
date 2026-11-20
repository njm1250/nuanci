"use client";

import { useEffect, useState } from "react";
import { Mascot } from "@/features/mascot/mascot";
import { BlockButton, SpeakerTag } from "./block-ui";
import { ReactionFace } from "./reaction-face";
import { sfx, toggleSound, useSoundEnabled } from "./sfx";
import { TRAP_LABELS, type Choice, type Expression } from "./types";
import { quotedIntent } from "@/features/collection/pairs";
import { BoldQuoted } from "./emphasis";
import { heardAs, Num, StakesNote, VerdictNote, VerdictStamp } from "./verdict";

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
export function HiddenReaction() {
  return (
    <span className="mt-1.5 flex items-center gap-2 text-note leading-snug text-ink-subtle">
      <span className="grid size-[18px] shrink-0 place-items-center border-2 border-ink-subtle font-label text-ui leading-none">?</span>
      반응 보기
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
  intent,
  waiting = false,
  spoke = false,
  partnerName,
  onReveal,
  friend = false,
  reduced = false,
}: {
  // 문제를 낸 친구가 처음 고른 보기. 아직 안 들어 본 보기여도 표시해서 눌러 보게 한다
  friend?: boolean;
  // 지금 펼친 카드에서 "하고 싶던 말 → 들린 느낌" 줄을 만드는 데 쓴다
  intent?: string;
  // 무대에서 상대가 아직 반응하기 전. 반응·인상·해설을 비워 두고 무대에 눈이 가게 한다. 반응이 뜨면 인상과 해설은 한 박자 뒤에 온다
  waiting?: boolean;
  // 반응을 기다리는 동안 상대가 영어 한마디를 이미 했는지. 했으면 그 말을 카드에 먼저 적어 두고 속마음을 기다린다
  spoke?: boolean;
  partnerName?: string;
  // 있으면 '속마음은 ···' 대신 사용자가 직접 여는 버튼을 둔다(한 상황의 첫 반응)
  onReveal?: () => void;
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
        {/* 상대가 영어로 한 겉말은 무대에서 지나가 버리므로, 천천히 다시 읽을 수 있게 카드에도 한 줄 남긴다 */}
        {active && (!waiting || spoke) && choice.says && (
          <span className="mt-2 flex animate-fade flex-wrap items-baseline gap-x-2 gap-y-0.5 text-note text-ink-muted">
            <span className="shrink-0 text-meta text-ink-subtle">상대 말</span>
            <span className="font-line text-ink">“{choice.says}”</span>
          </span>
        )}
        {/* 반응을 기다리는 동안 카드가 비어 보이지 않게, 무대에서 일어나는 일을 카드에도 차례로 적는다: 듣는 중 → 상대가 한 영어 → (속마음과 도장) */}
        {active && waiting && spoke && onReveal ? (
          <BlockButton primary label onClick={onReveal} className="mt-3 w-full animate-fade">
            속마음 보기
          </BlockButton>
        ) : active && waiting && (
          <span className="mt-2 flex items-center gap-2 text-note text-ink-subtle">
            <span className="shrink-0">{spoke ? "속마음은" : `${partnerName || "상대"} 듣는 중`}</span>
            <span aria-hidden className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`size-1.5 bg-current ${reduced ? "" : "animate-typing"}`} style={{ animationDelay: `${i * 160}ms` }} />
              ))}
            </span>
          </span>
        )}
        {/* 지금 고른 말의 상대 반응은 무대 생각 풍선에 있어서 카드에는 다시 적지 않는다. 다른 보기는 비교하려고 반응을 남긴다 */}
        {active ? null : revealed ? (
          <span key={verdictKey} className="mt-1 flex items-start gap-2 text-note leading-[1.5] text-ink-muted">
            <span className="mt-px">
              <ReactionFace expression={choice.expression} size={18} />
            </span>
            {choice.reaction}
          </span>
        ) : (
          <HiddenReaction />
        )}
        {/* 지금 고른 말의 주인공 덩어리: 하고 싶던 말이 어떤 느낌으로 들렸는지, 그래서 판정과 오해 크기는 어떤지를 연한 면 하나에 묶는다.
            이름표 없이 한 면에 두면 "내 마음 → 들린 말 → 결과"가 한 문장처럼 읽힌다. 웃음(반응)이 먼저 오고 이 면은 한 박자 뒤에 온다 */}
        {active && !waiting && (
          <span key={`heard-${verdictKey}`} className="mt-3 block animate-fade bg-surface px-3 py-2.5" style={{ animationDelay: `${heardAt}ms` }}>
            {intent && (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-body text-ink-muted">{quotedIntent(intent)}</span>
                <span aria-hidden className="text-body text-ink-subtle">→</span>
                <VerdictStamp choice={choice} pop={!reduced} delay={heardAt} />
              </span>
            )}
            <span className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${intent ? "mt-2" : ""}`}>
              <VerdictNote choice={choice} />
              {choice.stakes && <StakesNote stakes={choice.stakes} />}
            </span>
          </span>
        )}
        {!active && revealed && <span className="mt-1 block text-meta text-ink-subtle">→ {heardAs(choice)}</span>}
        {active && !waiting && (
          <span key={`why-${verdictKey}`} className="mt-3 block animate-fade text-body leading-[1.7] text-ink" style={{ animationDelay: `${heardAt + 250}ms` }}>
            <BoldQuoted text={choice.why} />
          </span>
        )}
        {meta && (friend || (revealed && (mine || (share ?? 0) > 0))) && <PickMeta mine={mine} friend={friend} share={revealed ? share : undefined} className="mt-1.5" />}
      </span>
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
