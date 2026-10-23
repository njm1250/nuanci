"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/features/scene/use-scene-flow";
import { PixelStage } from "@/features/stage/pixel-stage";
import type { ReelBeat } from "./reel";

const ASK_MS = 1900;
const BEAT_MS = 5600;

// 게임 데모 화면처럼 실제 장면의 직역 실수 순간을 자동으로 돌려 보여준다. 동작 줄이기 설정이면 첫 장면에서 멈춘다
export function AttractReel({ beats }: { beats: ReelBeat[] }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState({ index: 0, said: false, n: 0 });

  useEffect(() => {
    if (reduced || beats.length === 0) return;
    const t = setTimeout(
      () => setStep((s) => (s.said ? { index: (s.index + 1) % beats.length, said: false, n: s.n + 1 } : { ...s, said: true, n: s.n + 1 })),
      step.said ? BEAT_MS - ASK_MS : ASK_MS,
    );
    return () => clearTimeout(t);
  }, [step, reduced, beats.length]);

  if (beats.length === 0) return null;
  const said = reduced || step.said;
  const beat = beats[reduced ? 0 : step.index];

  return (
    <div className="relative h-full w-full">
      <PixelStage
        spec={beat.stage}
        reduced={reduced}
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
      <p key={`ask-${step.index}`} className="absolute left-2 top-2 animate-[fade-in_200ms] bg-ink px-2 py-1 font-pixel text-[15px] leading-none text-paper">
        「{beat.ask}」 영어로?
      </p>
      {said && (
        <p key={`punch-${step.n}`} className="absolute bottom-2 left-2 animate-[rise_240ms_ease-out_400ms_both] bg-gold px-2 py-1 font-pixel text-[15px] leading-none text-ink">
          → {beat.punch}
        </p>
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
