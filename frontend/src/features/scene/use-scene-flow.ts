"use client";

import { useState, useSyncExternalStore } from "react";
import type { Choice, Scene, Situation } from "./types";

export type Phase = "base" | "transition" | "followUp";
type Step = "base" | "followUp";

const find = (s: Situation, id: string | null): Choice | null => s.choices.find((c) => c.id === id) ?? null;

// 장면 하나의 진행 상태(기본 상황 → 만약에 전환 → 후속 상황 → 발견)를 관리한다
export function useSceneFlow(scene: Scene) {
  const [phase, setPhase] = useState<Phase>("base");
  const [viewed, setViewed] = useState<Record<Step, string | null>>({ base: null, followUp: null });
  const [reactionKey, setReactionKey] = useState(0);

  const step: Step = phase === "base" ? "base" : "followUp";
  const situation = step === "base" ? scene.base : scene.followUp;
  const choice = phase === "transition" ? null : find(situation, viewed[step]);

  function pick(id: string) {
    if (phase === "transition" || viewed[step] === id) return;
    setViewed((v) => ({ ...v, [step]: id }));
    setReactionKey((k) => k + 1);
  }

  return {
    phase,
    situation,
    choice,
    reactionKey,
    done: phase === "followUp" && choice !== null,
    pick,
    startTransition: () => setPhase("transition"),
    enterFollowUp: () => setPhase("followUp"),
  };
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

export function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(reducedMotionQuery);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

export function useCopyLink(path: string) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}${path}`);
      setState("copied");
    } catch {
      setState("failed");
    }
  }
  return { state, copy };
}
