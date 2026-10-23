"use client";

import { useState, useSyncExternalStore } from "react";
import type { Choice, Scene, Situation } from "./types";

export type Phase = "base" | "transition" | "followUp";
type Step = "base" | "followUp";

export type FlowEvent =
  | { type: "choice_selected" | "alternative_viewed"; step: Step; choiceId: string }
  | { type: "scene_completed" };

const find = (s: Situation, id: string | null): Choice | null => s.choices.find((c) => c.id === id) ?? null;

// 장면 하나의 진행 상태(기본 상황 → 만약에 전환 → 후속 상황 → 발견)를 관리한다
export function useSceneFlow(scene: Scene, onEvent?: (e: FlowEvent) => void) {
  const [phase, setPhase] = useState<Phase>("base");
  const [viewed, setViewed] = useState<Record<Step, string | null>>({ base: null, followUp: null });
  const [reactionKey, setReactionKey] = useState(0);

  const step: Step = phase === "base" ? "base" : "followUp";
  const situation = step === "base" ? scene.base : scene.followUp;
  const [picked, setPicked] = useState<Record<Step, string | null>>({ base: null, followUp: null });
  const choice = phase === "transition" ? null : find(situation, viewed[step]);

  function pick(id: string) {
    if (phase === "transition" || viewed[step] === id) return;
    const first = viewed[step] === null;
    if (first) setPicked((p) => ({ ...p, [step]: id }));
    setViewed((v) => ({ ...v, [step]: id }));
    setReactionKey((k) => k + 1);
    onEvent?.({ type: first ? "choice_selected" : "alternative_viewed", step, choiceId: id });
    if (first && step === "followUp") onEvent?.({ type: "scene_completed" });
  }

  return {
    phase,
    situation,
    choice,
    pickedId: phase === "transition" ? null : picked[step],
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

export function useCopyLink(path: string, onCopied?: () => void) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}${path}`);
      setState("copied");
      onCopied?.();
    } catch {
      setState("failed");
    }
  }
  return { state, copy };
}
