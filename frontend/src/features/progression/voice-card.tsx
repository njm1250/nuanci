"use client";

import Link from "next/link";
import { Panel } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { ReactionFace } from "@/features/scene/reaction-face";
import { TRAP_LABELS } from "@/features/scene/types";
import { useVoice, VOICE_MIN } from "./voice";

// 사원증 아래 바코드 막대 너비(도트)
const BARCODE = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2];

function Arrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="fill-current">
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}

// 진행 체계 하나로 모은 "영어의 나" 카드. 사원증 모양은 그대로 두고, 직급 대신 내 영어가 상대에게 어떻게 들리는 편인지 적는다.
// compact는 재방문 홈 옆 칸에 두는 작은 판이고, 내 정보 화면에서는 숫자까지 다 보여 준다
export function VoiceCard({ compact = false, name }: { compact?: boolean; name?: string }) {
  const voice = useVoice();
  const cleared = useCleared();
  const ready = voice.answered >= VOICE_MIN;
  return (
    <Panel>
      <div className="flex items-center justify-between bg-ink px-4 py-2.5 font-label text-ui text-fg">
        <span>
          <span className="text-pink">nuanci</span> 영어의 나
        </span>
        <span aria-hidden className="h-2 w-10 bg-fg/30" />
      </div>
      <div className="flex gap-4 px-4 pt-4">
        {!compact && (
          <span className="grid h-24 w-20 shrink-0 place-items-end justify-center border-2 border-ink bg-stage-sky pb-2">
            <ReactionFace expression={ready && voice.clear < 50 ? "awkward" : "happy"} size={60} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {!compact && (
            <>
              <p className="text-meta text-ink-subtle">이름</p>
              <p className="mt-0.5 truncate text-body font-semibold">{name ?? "손님"}</p>
            </>
          )}
          <p className={`${compact ? "" : "mt-3.5"} text-meta text-ink-subtle`}>영어로 들리는 나</p>
          <p className={`mt-0.5 font-bold leading-snug ${ready ? "text-title text-ink" : "text-body text-ink-muted"}`}>{voice.headline}</p>
          {ready && voice.top && <p className="mt-1 text-meta text-ink-subtle">가장 자주 걸린 함정 · {TRAP_LABELS[voice.top.trap]} {voice.top.count}번</p>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x-2 divide-ink/10 border-y-2 border-ink/10">
        <Stat label="의도대로 들린 답" value={voice.answered ? `${voice.clear}%` : "–"} />
        <Stat label="해 본 장면" value={`${cleared.length}`} />
      </div>
      {compact ? (
        <Link href="/me" className="flex min-h-11 items-center justify-between gap-3 px-4 text-ui text-ink-muted hover:text-ink">
          자세히 보기
          <Arrow />
        </Link>
      ) : (
        <div aria-hidden className="flex h-9 items-stretch gap-[2px] px-4 py-2">
          {BARCODE.map((w, i) => (
            <span key={i} className="bg-current" style={{ width: w * 2 }} />
          ))}
          <span className="ml-auto self-end font-label text-ui leading-none text-ink-subtle">질문 {voice.answered}</span>
        </div>
      )}
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-3 text-center">
      <span className="font-poster text-display-sm leading-none tabular-nums">{value}</span>
      <span className="mt-1 text-meta text-ink-subtle">{label}</span>
    </div>
  );
}
