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
  const [seen, setSeen] = useState<Record<Step, string[]>>({ base: [], followUp: [] });
  const choice = phase === "transition" ? null : find(situation, viewed[step]);

  function pick(id: string) {
    if (phase === "transition" || viewed[step] === id) return;
    const first = viewed[step] === null;
    if (first) setPicked((p) => ({ ...p, [step]: id }));
    setSeen((s) => ({ ...s, [step]: [...s[step], id] }));
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
    seenIds: phase === "transition" ? [] : seen[step],
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

// 휴대폰에서는 공유 시트(카톡·인스타 등)를 열고, 지원하지 않는 브라우저에서는 문구와 링크를 복사한다
export function useShare(path: string, text: string, onShared?: () => void) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function share() {
    const url = `${location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        onShared?.();
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setState("copied");
      onShared?.();
    } catch {
      setState("failed");
    }
  }
  return { state, share };
}
