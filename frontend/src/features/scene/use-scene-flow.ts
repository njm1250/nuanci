"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { quotedIntent } from "@/features/collection/pairs";
import type { Choice, Scene, Situation } from "./types";
import { heardAs } from "./verdict";

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
  // 이어지는 장면은 타이머로 넘어가서, effect가 매번 다시 걸리지 않게 같은 함수를 돌려준다
  const enterFollowUp = useCallback(() => setPhase("followUp"), []);

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
    picked,
    seenIds: phase === "transition" ? [] : seen[step],
    reactionKey,
    done: phase === "followUp" && choice !== null,
    pick,
    startTransition: () => setPhase("transition"),
    enterFollowUp,
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

// 친구에게 보내는 한마디. "풀어 봐" 대신 방금 내 말이 어떻게 들렸는지를 그대로 적어서, 링크를 누르기 전에 이미 사연 하나가 되게 한다
export function shareMessage(scene: Scene, first: Choice | undefined) {
  const ask = "너라면 뭐라고 할래?";
  if (!first) return `"${scene.title}" ${ask}`;
  const intent = scene.base.intent;
  const said = intent.lastIndexOf(" 하고 ") > 0 ? `${quotedIntent(intent)} ${first.verdict === "good" ? "했는데" : "했다가"}` : `"${scene.title}"에서 ${first.verdict === "good" ? "말했는데" : "말했다가"}`;
  return `나 방금 영어로 ${said} "${heardAs(first)}" 나왔어.\n${ask}`;
}

// 휴대폰에서는 공유 시트(카톡·인스타 등)를 열고, 지원하지 않는 브라우저에서는 문구와 링크를 복사한다.
// 링크를 url로 따로 넘기면 앱마다 문구 앞에 띄어쓰기 없이 붙여서, 문구 맨 끝 줄에 넣어 보낸다.
// from은 어디서 눌렀는지(결과 카드 / 완료 화면). 자리별로 얼마나 눌리는지 가르는 데 쓴다
export type ShareFrom = "card" | "wrap";
export function useShare(path: string, text: string, onShared?: (from: ShareFrom) => void) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function share(from: ShareFrom = "wrap") {
    const url = `${location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: `${text}\n${url}` });
        onShared?.(from);
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setState("copied");
      onShared?.(from);
    } catch {
      setState("failed");
    }
  }
  return { state, share };
}
