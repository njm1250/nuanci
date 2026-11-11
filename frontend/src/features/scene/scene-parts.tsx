"use client";

import { useEffect, useState } from "react";
import { Mascot } from "@/features/mascot/mascot";
import { SpeakerTag } from "./block-ui";
import { ReactionFace } from "./reaction-face";
import { sfx, toggleSound, useSoundEnabled } from "./sfx";
import { TRAP_LABELS, type Choice, type Expression } from "./types";
import { spoken } from "@/features/collection/pairs";
import { heardAs, Num, VerdictStamp } from "./verdict";

// 검수 미리보기에서만 보이는 함정 유형 표시
export function TrapChip({ choice }: { choice: Choice }) {
  return <span className="shrink-0 border-2 border-current px-1 py-0.5 font-label-strong text-meta leading-none opacity-80">{choice.trap ? TRAP_LABELS[choice.trap] : "전달됨"}</span>;
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

// Mochi가 옆에서 말을 거는 한 줄. 반말 안내가 서비스 말투가 아니라 고양이 말로 들리게 한다(메뉴의 "어디로 갈까?"와 같은 모양)
export function MochiAsk({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [hop, setHop] = useState(0);
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      {/* 누르면 제자리에서 콩 뛴다. 그냥 장식이지만 눌러 보는 사람에게 작은 대답이 된다 */}
      <button type="button" aria-label="Mochi 쓰다듬기" onClick={() => (setHop((n) => n + 1), sfx.tap())} className="-m-1 shrink-0 p-1">
        <Mascot key={hop} scale={2} className={hop ? "animate-hop" : ""} />
      </button>
      <div className="blk-frame-sm mb-2 min-w-0">
        <p className="blk bg-white px-2.5 py-1.5 text-note font-bold leading-snug text-ink-fixed">{children}</p>
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
  revealed,
  verdictKey,
  share,
  meta = true,
  intent,
  waiting = false,
}: {
  // 지금 펼친 카드에서 "하고 싶던 말 → 들린 느낌" 줄을 만드는 데 쓴다
  intent?: string;
  // 무대에서 상대가 아직 반응하기 전. 반응·인상·해설을 비워 두고 무대에 눈이 가게 한다. 반응이 뜨면 인상과 해설은 한 박자 뒤에 온다
  waiting?: boolean;
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
  const heardAt = 500;
  return (
    <span className="flex items-start gap-3">
      <Num n={n} dark={active} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-line text-say leading-snug">{choice.line}</span>
          {showTrap && (
            <span className="shrink-0 pt-1">
              <TrapChip choice={choice} />
            </span>
          )}
        </span>
        {active && waiting ? (
          <span aria-hidden className="mt-1.5 flex h-6 items-center gap-1 text-ink-subtle">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 animate-typing bg-current" style={{ animationDelay: `${i * 160}ms` }} />
            ))}
          </span>
        ) : revealed ? (
          <span key={verdictKey} className={`flex items-start gap-2 leading-[1.5] ${active ? "mt-1.5 animate-rise text-body font-bold text-ink" : "mt-1 text-note text-ink-muted"}`}>
            <span className="mt-px">
              <ReactionFace expression={choice.expression} size={18} />
            </span>
            {choice.reaction}
          </span>
        ) : (
          <HiddenReaction />
        )}
        {/* 지금 고른 말의 주인공 줄: 하고 싶던 말이 어떤 느낌으로 들렸는지. 웃음(반응)이 먼저 오고 설명은 한 박자 뒤에 온다 */}
        {active && !waiting && intent && (
          <span key={`heard-${verdictKey}`} className="mt-3 flex animate-fade flex-wrap items-center gap-x-2 gap-y-1.5" style={{ animationDelay: `${heardAt}ms` }}>
            <span className="text-note text-ink-muted">「{spoken(intent)}」</span>
            <span aria-hidden className="text-note text-ink-subtle">→</span>
            <VerdictStamp choice={choice} pop delay={heardAt} />
          </span>
        )}
        {!active && revealed && <span className="mt-1 block text-meta text-ink-subtle">→ {heardAs(choice)}</span>}
        {active && !waiting && (
          <span key={`why-${verdictKey}`} className="mt-3 block animate-fade text-ui leading-[1.6] text-ink-muted" style={{ animationDelay: `${heardAt + 300}ms` }}>
            {choice.why}
          </span>
        )}
        {meta && revealed && (mine || share !== undefined) && <PickMeta mine={mine} share={share} className="mt-1.5" />}
      </span>
    </span>
  );
}


// 내가 고른 보기인지, 첫 답으로 몇 %가 골랐는지. 본문보다 두 단계 작고 흐리게 둔다
export function PickMeta({ mine, share, className = "" }: { mine: boolean; share?: number; className?: string }) {
  return (
    <span className={`flex flex-wrap items-center gap-x-1.5 text-meta tabular-nums text-ink-subtle ${className}`}>
      {mine && <span className="border border-ink/25 px-1 py-px font-semibold text-ink-muted">내 선택</span>}
      {share !== undefined && <span>첫 답으로 {share}%가 골랐어요</span>}
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
