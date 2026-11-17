"use client";

import { quotedIntent } from "@/features/collection/pairs";
import { BlockButton, Panel } from "./block-ui";
import { MochiAsk } from "./scene-parts";
import { RUN_SIZE, runSummary, type Run } from "./run";
import { VERDICTS } from "./verdict";

const SLOTS = Array.from({ length: RUN_SIZE }, (_, i) => i + 1);

// 머리줄에 두는 "세 장면 중 몇 번째". 좁은 폰에서 장면 제목을 덜 밀어내게 숫자만 둔다
export function RunChip({ at }: { at: number }) {
  return (
    <span aria-label={`장면 ${RUN_SIZE}개 중 ${at}번째`} className="shrink-0 whitespace-nowrap rounded-full border border-current/40 px-2 py-0.5 font-label text-meta tabular-nums">
      {at}/{RUN_SIZE}
    </span>
  );
}

// 장면을 끝낸 자리에서 무엇이 얼마나 남았는지 한 문장과 세 칸 막대로 말한다. "결과"가 무엇인지 이름을 붙여서 적는다
export function RunSteps({ done }: { done: number }) {
  const left = RUN_SIZE - done;
  return (
    <div className="mb-5">
      <p className="flex items-baseline justify-between gap-3 text-note text-fg-muted">
        <span>
          {left === 1 ? "한 장면만 더 하면" : "두 장면 더 하면"} <b className="font-bold text-fg">내 영어 말투</b>가 나와요
        </span>
        <span className="shrink-0 text-meta tabular-nums text-fg-subtle">
          {done}/{RUN_SIZE}
        </span>
      </p>
      <div role="progressbar" aria-valuenow={done} aria-valuemax={RUN_SIZE} aria-label="내 영어 말투까지" className="mt-2 grid grid-cols-3 gap-1">
        {SLOTS.map((n) => (
          <span key={n} className={`h-2.5 border-2 border-fg ${n <= done ? "bg-pink" : ""}`} />
        ))}
      </div>
    </div>
  );
}

// 곧 채워질 자리라는 표시. 말풍선 점 셋이 차례로 깜박인다(동작 줄이기 설정이면 멈춘 점)
export function WaitDots({ reduced }: { reduced: boolean }) {
  return (
    <span aria-hidden className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`size-1.5 bg-current ${reduced ? "" : "animate-typing"}`} style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}

function Band() {
  return (
    <div className="flex items-center justify-between bg-ink px-4 py-2.5 font-label text-ui text-fg">
      <span>
        <span className="text-pink">nuanci</span> 내 영어 말투
      </span>
    </div>
  );
}

// 엔딩 컷이 끝나기를 기다리는 동안 결과 장 자리에 두는 틀. 머리띠는 먼저 보여서 무엇이 올지 알리고, 누르면 바로 채운다
export function RunResultWaiting({ reduced, onSkip }: { reduced: boolean; onSkip: () => void }) {
  return (
    <button type="button" onClick={onSkip} aria-label="결과 바로 보기" className="block w-full text-left">
      <Panel className="blk-strong">
        <Band />
        <div className="px-4 pb-5 pt-4 text-ink-subtle">
          <p className="flex items-center gap-2 text-meta">
            방금 한 말을 모으는 중
            <WaitDots reduced={reduced} />
          </p>
          <span aria-hidden className="mt-3 block h-6 w-3/4 bg-surface-strong" />
          <span aria-hidden className="mt-4 block h-4 w-1/2 bg-surface" />
          <span aria-hidden className="mt-2 block h-4 w-2/3 bg-surface" />
        </div>
      </Panel>
    </button>
  );
}

// 판을 끝낸 순간의 결과 장. 이번 판에서 내 말이 어떻게 들리는 편이었는지와, 통하지 않은 말을 그대로 옮겨 적는다.
// 틀린 말이 벌점이 아니라 이 장을 채우는 재료가 되게, 점수 대신 "몇 번 중 몇 번"과 들린 느낌만 쓴다
export function RunResult({ run, onShare, shareState }: { run: Run; onShare: () => void; shareState: "idle" | "copied" | "failed" }) {
  const { picks, mishaps, good, headline } = runSummary(run);
  return (
    <Panel className="blk-strong">
      <Band />
      <div className="px-4 pb-1 pt-4">
        {/* 질문 화면에서 "너라면 뭐라고 할래?"를 묻던 Mochi가 결과도 말해 준다. 머리말이 안내문이 아니라 한 사람의 말로 읽히게 */}
        <MochiAsk>방금 세 장면에서 네 영어는…</MochiAsk>
        <p className="mt-2 text-say font-bold leading-snug">{headline}</p>
        <p className="mt-1 text-meta text-ink-subtle">
          {picks.length}번 중 {good}번 의도대로 들렸어요
        </p>
        {mishaps.length > 0 ? (
          <>
            <p className="mt-4 border-t-2 border-dashed border-ink/20 pt-3 text-meta text-ink-subtle">의도와 다르게 들린 말</p>
            <ul className="mt-2 space-y-3">
              {mishaps.map((p, i) => (
                <li key={`${p.sceneId}:${p.step}`}>
                  <p className="text-meta leading-snug text-ink-subtle">{quotedIntent(p.intent)}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-line text-body leading-snug">{p.line}</span>
                    <span
                      className={`inline-block -rotate-3 animate-stamp border-2 border-ink px-1.5 py-1 font-label-strong text-meta leading-none text-ink ${VERDICTS[p.verdict].color}`}
                      style={{ animationDelay: `${200 + i * 120}ms` }}
                    >
                      {p.heard}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-4 border-t-2 border-dashed border-ink/20 pt-3 text-body leading-snug">모두 의도대로 들렸어요.</p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink/10 py-2.5">
          <p className="min-w-0 text-meta text-ink-subtle">친구에게 내 결과를 보내 볼까요?</p>
          <BlockButton onClick={onShare} className="shrink-0" faceClassName="font-label text-ui text-ink">
            {shareState === "copied" ? "복사됨" : shareState === "failed" ? "복사 실패" : "결과 보내기"}
          </BlockButton>
        </div>
      </div>
    </Panel>
  );
}
