"use client";

import { useState } from "react";
import { BlockButton } from "./block-ui";
import { visitorId } from "./track";
import type { Expression, Verdict } from "./types";

export type FreeOutcome = "pending" | "matched" | "reacted" | "off_topic" | "too_far" | "failed";
export type FreeLine = { step: "base" | "followUp"; line: string; outcome: FreeOutcome; choiceId?: string; verdict?: Verdict; heard?: string; expression?: Expression; thought?: string };

// 보기 목록의 마지막 칸 "내 말로 해 보기". 떠올린 영어가 보기에 없을 때 직접 말하면, 서버가 가장 가까운 보기에 대 보고
// 없으면 판정·들린 느낌·표정·속마음을 돌려준다. 판정을 받은 말은 부모가 보기 하나로 더해 다른 보기처럼 고른다(도장·비교·다음으로).
// 무대와 Mochi의 말은 부모(scene-player)가 free 값으로 그린다
export function FreeLineSlot({
  n,
  open,
  onOpen,
  sceneId,
  sceneVersion,
  step,
  free,
  numberOf,
  onSay,
  onResult,
  onPick,
  onReset,
  onDraftChange,
}: {
  n: number;
  open: boolean;
  onOpen: () => void;
  sceneId: string;
  sceneVersion: number;
  step: "base" | "followUp";
  free: FreeLine | null;
  // 보기 id → 화면의 번호와 문장. 대 본 보기를 "2번"처럼 가리킬 때 쓴다
  numberOf: (id: string) => { n: number; line: string } | null;
  onSay: (line: string) => void;
  // 결과와 함께 말한 문장을 넘긴다. 보낼 때의 화면 값(아직 비어 있음)에 기대지 않게 한다
  onResult: (r: Omit<FreeLine, "step" | "line">, line: string) => void;
  onPick: (id: string) => void;
  onReset: () => void;
  onDraftChange?: (draft: string) => void;
}) {
  const [text, setText] = useState("");

  const updateText = (v: string) => {
    setText(v);
    onDraftChange?.(v);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const said = text.trim();
    if (said.length < 2 || free?.outcome === "pending") return;
    onDraftChange?.("");
    onSay(said);
    try {
      const res = await fetch("/api/missing-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitorId(), sceneId, sceneVersion, step, text: said }),
      });
      if (!res.ok) return onResult({ outcome: "failed" }, said);
      const r = (await res.json()) as { outcome: string; matchedChoiceId?: string; verdict?: Verdict; heard?: string; expression?: Expression; thought?: string };
      if (r.outcome === "matched" && r.matchedChoiceId && numberOf(r.matchedChoiceId)) return onResult({ outcome: "matched", choiceId: r.matchedChoiceId }, said);
      if (r.outcome === "reacted" && r.thought && r.verdict && r.heard) return onResult({ outcome: "reacted", verdict: r.verdict, heard: r.heard, expression: r.expression ?? "neutral", thought: r.thought }, said);
      if (r.outcome === "off_topic" || r.outcome === "too_far") return onResult({ outcome: r.outcome }, said);
      onResult({ outcome: "failed" }, said);
    } catch {
      onResult({ outcome: "failed" }, said);
    }
  };

  if (!open)
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-3 border-2 border-dashed border-fg-subtle/60 px-3 py-3 text-left text-fg hover:border-fg"
      >
        <span aria-hidden className="grid size-6 shrink-0 place-items-center border-2 border-ink/20 font-label text-ui text-ink-muted group-hover:border-fg">
          {n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-label text-ui">내 말로 해 보기</span>
          <span className="block text-meta text-fg-subtle">떠올린 영어가 보기에 없으면</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-current text-fg-subtle">
          <path d="M6 0h1v1h1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-2h1v-1h1v-1h1v-1h1v-1h1z" />
        </svg>
      </button>
    );

  // 말한 뒤의 칸: 내가 한 말을 대사처럼 크게, 그 아래에 결과. Mochi의 한마디는 목록 위 말풍선이 맡는다
  if (free && free.step === step) {
    const hit = free.choiceId ? numberOf(free.choiceId) : null;
    return (
      <div className="border-2 border-fg bg-card-raised px-3 py-3 text-ink animate-fade">
        <p className="flex items-start gap-3">
          <span aria-hidden className="grid size-6 shrink-0 place-items-center bg-ink font-label text-ui text-white">
            {n}
          </span>
          <span className="min-w-0 flex-1 font-line text-say leading-snug">{free.line}</span>
        </p>
        <div className="mt-2 pl-9">
          {free.outcome === "pending" ? (
            <span aria-label="듣는 중" className="flex h-6 items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-typing bg-ink-subtle" style={{ animationDelay: `${i * 160}ms` }} />
              ))}
            </span>
          ) : free.outcome === "matched" && hit ? (
            <BlockButton label onClick={() => onPick(free.choiceId!)}>
              {hit.n}번 반응 보기
            </BlockButton>
          ) : null}
          {free.outcome !== "pending" && (
            <button type="button" onClick={() => (updateText(""), onReset())} className="-mx-1 mt-1 flex min-h-11 items-center px-1 text-meta text-ink-subtle underline underline-offset-4 hover:text-ink">
              다시 말하기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="border-2 border-fg bg-card-raised px-3 py-3 text-ink">
      <label htmlFor="free-line" className="block text-meta text-ink-subtle">
        떠올린 영어를 그대로 써 봐
      </label>
      <div className="mt-1.5 flex items-stretch gap-2">
        <input
          id="free-line"
          value={text}
          onChange={(e) => updateText(e.target.value)}
          maxLength={200}
          autoFocus
          lang="en"
          autoCapitalize="sentences"
          placeholder="영어로 한마디 써 봐!"
          className="min-w-0 flex-1 border-2 border-ink bg-white px-3 py-2 font-line text-body text-ink-fixed placeholder:text-ink-subtle"
        />
        <BlockButton label type="submit" className="shrink-0">
          말하기
        </BlockButton>
      </div>
    </form>
  );
}
