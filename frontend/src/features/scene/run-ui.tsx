"use client";

import { quotedIntent } from "@/features/collection/pairs";
import { BlockButton, Panel } from "./block-ui";
import { Mascot } from "@/features/mascot/mascot";
import { RUN_SIZE, runSummary, type Run } from "./run";

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
  // 한 줄로 줄인다. 완료 화면의 주인공은 방금 배운 표현과 다음 장면이라 진행은 곁가지로 둔다
  return (
    <div className="mb-4 flex items-center gap-3 text-note text-fg-muted">
      <span className="min-w-0 flex-1">
        {left === 1 ? "한 장면만 더 하면" : "두 장면 더 하면"} <b className="font-bold text-fg">영어 말투 보고서</b>
      </span>
      <RunBar done={done} />
      <span className="shrink-0 text-meta tabular-nums text-fg-subtle">
        {done}/{RUN_SIZE}
      </span>
    </div>
  );
}

// 장면 셋 중 몇 개를 끝냈는지 세 칸 막대. line은 칸 테두리 색(진한 띠 위에서는 흰 선)
export function RunBar({ done, line = "border-fg" }: { done: number; line?: string }) {
  return (
    <span role="progressbar" aria-valuenow={done} aria-valuemax={RUN_SIZE} aria-label="영어 말투 보고서까지" className="flex shrink-0 gap-1">
      {SLOTS.map((n) => (
        <span key={n} className={`h-2.5 w-5 border-2 ${line} ${n <= done ? "bg-pink" : ""}`} />
      ))}
    </span>
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
        <span className="text-pink">nuanci</span> 영어 말투 보고서
      </span>
    </div>
  );
}

// 엔딩 컷이 끝나기를 기다리는 동안 결과 장 자리에 두는 틀. 머리띠는 먼저 보여서 무엇이 올지 알리고, 누르면 바로 채운다
export function RunResultWaiting({ reduced, onSkip }: { reduced: boolean; onSkip: () => void }) {
  return (
    <button type="button" onClick={onSkip} aria-label="영어 말투 보고서 바로 보기" className="block w-full text-left">
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

// 녹음실의 Mochi: 헤드폰을 쓰고 마이크 앞에 선다. 방금 한 말을 녹음해 다시 들어 본다는 결과 장의 장면이다(도트 그림이라 색을 직접 쓴다)
function MochiOnAir() {
  return (
    <span aria-hidden className="relative flex shrink-0 items-end gap-1">
      <svg width="28" height="56" viewBox="0 0 7 14" shapeRendering="crispEdges">
        <g fill="#3b4a7a">
          <rect x="2" y="2" width="3" height="4" />
          <rect x="3" y="6" width="1" height="6" />
          <rect x="1" y="12" width="5" height="2" />
        </g>
        <rect x="2" y="3" width="3" height="1" fill="#a3abc4" />
        <g fill="#a3abc4">
          <rect x="5" y="0" width="1" height="1" />
          <rect x="6" y="1" width="1" height="1" />
        </g>
      </svg>
      <span className="relative">
        <Mascot scale={3} />
        <svg width="48" height="51" viewBox="0 0 16 17" shapeRendering="crispEdges" className="absolute inset-0">
          <rect x="4" y="1" width="8" height="1" fill="#3b4a7a" />
          <rect x="3" y="2" width="1" height="1" fill="#3b4a7a" />
          <rect x="12" y="2" width="1" height="1" fill="#3b4a7a" />
          <rect x="0" y="5" width="2" height="4" fill="#3b4a7a" />
          <rect x="14" y="5" width="2" height="4" fill="#3b4a7a" />
        </svg>
      </span>
    </span>
  );
}

// 소리 줄. 영어로 한 말에서 들린 느낌 말풍선으로 이어지는 선이다
function Wave() {
  return (
    <svg width="24" height="12" viewBox="0 0 12 6" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-current text-ink-subtle">
      <path d="M0 3h1v1H0zM2 2h1v3H2zM4 0h1v6H4zM6 2h1v3H6zM8 3h4v1H8z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-current">
      <path d="M3 0h4v4h-1v-2h-1v1h-1v1h-1v1h-1v-1h1v-1h1v-1h1v-1h-2zM0 2h2v1h-1v3h3v-1h1v2h-5z" />
    </svg>
  );
}

// 판을 끝낸 순간의 결과 장. 이번 판에서 내 말이 어떻게 들리는 편이었는지와, 통하지 않은 말을 그대로 옮겨 적는다.
// 틀린 말이 벌점이 아니라 이 장을 채우는 재료가 되게, 점수 대신 "몇 번 중 몇 번"과 들린 느낌만 쓴다
export function RunResult({ run, onShare, shareState }: { run: Run; onShare: () => void; shareState: "idle" | "copied" | "failed" }) {
  const { picks, mishaps, good, headline } = runSummary(run);
  return (
    <Panel className="blk-strong">
      <Band />
      {/* 위: 결과 한 줄을 도트 제목으로 크게, 옆에 녹음실 Mochi. 몇 번 중 몇 번은 칸으로도 보여 준다 */}
      <div className="flex items-end gap-3 bg-surface px-4 pb-4 pt-3.5 text-ink">
        <div className="min-w-0 flex-1">
          <p className="text-meta text-ink-subtle">방금 세 장면에서 네 영어는…</p>
          <p className="mt-1.5 font-poster text-display-sm leading-[1.25]">{headline}</p>
          <p className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta text-ink-muted">
            <span role="img" aria-label={`${picks.length}번 중 ${good}번`} className="flex gap-0.5">
              {picks.map((p, i) => (
                <span key={`${p.sceneId}:${p.step}`} className={`size-2.5 border-2 border-ink ${i < good ? "bg-ink" : ""}`} />
              ))}
            </span>
            {picks.length}번 중 {good}번 의도대로 들렸어요
          </p>
        </div>
        <MochiOnAir />
      </div>
      <div className="border-t-2 border-dashed border-ink/30 px-4 pb-1 pt-3.5">
        {mishaps.length > 0 ? (
          <>
            <p className="font-poster text-title text-ink">의도와 다르게 들린 말</p>
            {/* 녹음 대본처럼: 하고 싶던 말, 실제로 한 영어, 소리 줄 끝에 상대에게 들린 느낌 */}
            <ul className="mt-1 divide-y divide-line/60">
              {mishaps.map((p, i) => (
                <li key={`${p.sceneId}:${p.step}`} className="py-3">
                  <p className="text-meta leading-snug text-ink-subtle">{quotedIntent(p.intent)}</p>
                  <p className="mt-1 flex items-center gap-2">
                    <span className="min-w-0 flex-1 font-line text-say leading-snug">{p.line}</span>
                    <Wave />
                    {/* 들린 느낌은 무대의 상대 말풍선과 같은 모양(흰 칸, 먹선, 도트 꼬리)으로 둔다. 색 테두리 칸보다 "상대가 이렇게 알아들었다"로 읽힌다 */}
                    <span className="relative ml-1.5 max-w-[46%] shrink-0 animate-pop" style={{ animationDelay: `${200 + i * 120}ms` }}>
                      <span className="block border-2 border-ink bg-white px-2 py-1.5 font-label-strong text-meta leading-snug text-ink-fixed">{p.heard}</span>
                      <svg width="8" height="10" viewBox="0 0 4 5" shapeRendering="crispEdges" aria-hidden className="absolute -left-[6px] top-1/2 -translate-y-1/2">
                        <path d="M3 0h1v1h-1zM2 1h1v1h-1zM1 2h1v1h-1zM2 3h1v1h-1zM3 4h1v1h-1z" className="fill-ink" />
                        <path d="M3 1h1v3h-1zM2 2h1v1h-1z" className="fill-white" />
                      </svg>
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="py-2 text-body leading-snug">모두 의도대로 들렸어요.</p>
        )}
        {/* 이 화면의 분홍 주 버튼은 아래 고정 칸의 다음 장면이라, 결과 보내기는 흰 보조 버튼으로 둔다 */}
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-ink/10 py-2.5">
          <p className="min-w-0 text-meta text-ink-subtle">친구에게 내 결과를 보내 볼까요?</p>
          <BlockButton onClick={onShare} className="shrink-0" faceClassName="flex items-center gap-1.5 font-label text-ui text-ink">
            {shareState === "copied" ? "복사됨" : shareState === "failed" ? "복사 실패" : "결과 보내기"}
            {shareState === "idle" && <ShareIcon />}
          </BlockButton>
        </div>
      </div>
    </Panel>
  );
}
