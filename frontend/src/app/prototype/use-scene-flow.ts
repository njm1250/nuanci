"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { scene as defaultScene, type Choice, type Scene, type Situation } from "./scene";

export type Phase = "base" | "transition" | "followUp";
type Step = "base" | "followUp";

const find = (s: Situation, id: string | null): Choice | null =>
  s.choices.find((c) => c.id === id) ?? null;

// 장면 하나의 진행 상태(기본 상황 → 만약에 전환 → 후속 상황 → 발견)를 관리한다
export function useSceneFlow(scene: Scene = defaultScene) {
  const [phase, setPhase] = useState<Phase>("base");
  const [firstPick, setFirstPick] = useState<Record<Step, string | null>>({
    base: null,
    followUp: null,
  });
  const [viewed, setViewed] = useState<Record<Step, string | null>>({
    base: null,
    followUp: null,
  });
  const [reactionKey, setReactionKey] = useState(0);

  const step: Step = phase === "base" ? "base" : "followUp";
  const situation = step === "base" ? scene.base : scene.followUp;
  const choice = phase === "transition" ? null : find(situation, viewed[step]);

  function pick(id: string) {
    if (phase === "transition" || viewed[step] === id) return;
    setFirstPick((p) => (p[step] ? p : { ...p, [step]: id }));
    setViewed((v) => ({ ...v, [step]: id }));
    setReactionKey((k) => k + 1);
  }

  function restart() {
    setPhase("base");
    setViewed({ base: null, followUp: null });
    setFirstPick({ base: null, followUp: null });
    setReactionKey((k) => k + 1);
  }

  return {
    scene,
    phase,
    step,
    situation,
    choice,
    baseChoice: find(scene.base, viewed.base),
    followUpChoice: find(scene.followUp, viewed.followUp),
    firstPick,
    reactionKey,
    done: phase === "followUp" && choice !== null,
    pick,
    startTransition: () => setPhase("transition"),
    enterFollowUp: () => setPhase("followUp"),
    restart,
  };
}

// 대사를 보낸 뒤 상대 반응을 잠깐 늦게 보여줄 때 쓴다
export function useDelayedReveal(key: number, active: boolean, delayMs: number) {
  const [revealedKey, setRevealedKey] = useState(-1);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setRevealedKey(key), delayMs);
    return () => clearTimeout(id);
  }, [key, active, delayMs]);
  return active && revealedKey === key;
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

export function useCopyLink() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/prototype`);
      setState("copied");
    } catch {
      setState("failed");
    }
  }
  return { state, copy };
}
