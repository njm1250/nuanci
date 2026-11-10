"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useHeroLook } from "@/features/rewards/hero-look";
import { useReducedMotion } from "@/features/scene/use-scene-flow";
import { C } from "@/features/stage/palette";
import { Stage } from "@/features/stage/stage";
import { SET_WALLS } from "@/features/stage/walls";
import type { ReelBeat } from "./reel";
import { useIdle } from "./use-idle";

const noop = () => () => {};

// 다시 온 방문자에게는 데모를 숨긴다(layout의 인라인 스크립트가 html에 data-returning을 붙인다). 숨긴 데모의 무대까지 띄우지 않는다
function useReturning() {
  return useSyncExternalStore(noop, () => document.documentElement.hasAttribute("data-returning"), () => false);
}

const ASK_MS = 1900;
const BEAT_MS = 5600;

// 게임 데모 화면처럼 실제 장면의 직역 실수 순간을 자동으로 돌려 보여준다. 동작 줄이기 설정이면 첫 장면에서 멈춘다.
// 자동으로 계속 움직이는 콘텐츠라 사용자가 멈출 수 있게 한다 (WCAG 2.2.2)
export function AttractReel({ beats }: { beats: ReelBeat[] }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState({ index: 0, said: false, n: 0 });
  const [paused, setPaused] = useState(false);
  const look = useHeroLook();
  const returning = useReturning();
  // 첫 화면의 글자와 버튼이 먼저 그려지고 반응하도록, 데모 무대(three.js)는 페이지를 다 불러온 뒤 한가할 때 띄운다
  const idle = useIdle();

  useEffect(() => {
    if (returning || reduced || paused || beats.length === 0) return;
    const t = setTimeout(
      () => setStep((s) => (s.said ? { index: (s.index + 1) % beats.length, said: false, n: s.n + 1 } : { ...s, said: true, n: s.n + 1 })),
      step.said ? BEAT_MS - ASK_MS : ASK_MS,
    );
    return () => clearTimeout(t);
  }, [step, returning, reduced, paused, beats.length]);

  if (beats.length === 0 || returning) return null;
  const said = reduced || step.said;
  const beat = beats[reduced ? 0 : step.index];

  return (
    <div className="absolute inset-0">
      {idle ? (
        <Stage
          spec={{ ...beat.stage, hero: look.hero, wear: look.wear }}
          reduced={reduced}
          paused={paused}
          state={{
            partnerMotion: said ? beat.motion : beat.partnerIdle,
            partnerKey: step.n,
            partnerProp: said ? (beat.partnerProp ?? beat.partnerIdleProp) : beat.partnerIdleProp,
            meMotion: said ? beat.meMotion : undefined,
            meKey: step.n,
            meProp: said ? beat.meProp : undefined,
            talkKey: said ? step.n : 0,
            reaction: said ? beat.expression : null,
            meLine: said ? beat.line : undefined,
            partnerLine: beat.partnerLine,
            meTurn: !said,
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0" style={{ background: SET_WALLS[beat.stage.set][beat.stage.time] }}>
          <div className="absolute inset-x-0 bottom-0 h-[18%]" style={{ background: C.floor }} />
        </div>
      )}
      <p key={`ask-${step.index}`} className="absolute left-2 top-2 animate-fade bg-ink px-2 py-1 font-pixel text-ui leading-none text-paper">
        「{beat.ask}」 영어로?
      </p>
      {said && (
        <p key={`punch-${step.n}`} className="absolute bottom-2 left-2 animate-rise [animation-delay:400ms] border-2 border-ink bg-[#ffffff] px-2 py-1 font-pixel text-ui leading-none text-ink">
          → {beat.punch}
        </p>
      )}
      {!reduced && (
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-label={paused ? "데모 다시 재생" : "데모 멈추기"}
          className="absolute right-0 top-0 grid size-11 place-items-center"
        >
          <span className="grid size-7 place-items-center bg-ink/70 text-paper">
            <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="fill-current">
              <path d={paused ? "M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" : "M1 0h1v5h-1zM3 0h1v5h-1z"} />
            </svg>
          </span>
        </button>
      )}
      {!reduced && beats.length > 1 && (
        <div className="absolute bottom-3 right-3 flex gap-1.5" aria-hidden>
          {beats.map((_, i) => (
            <span key={i} className={`size-1.5 ${i === step.index ? "bg-ink" : "bg-ink/25"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
