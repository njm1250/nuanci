"use client";

import { useState } from "react";
import { BlockButton } from "./block-ui";
import { visitorId } from "./track";
import type { Expression, Verdict } from "./types";

export type FreeOutcome = "pending" | "matched" | "reacted" | "off_topic" | "too_far" | "failed";
export type FreeLine = { step: "base" | "followUp"; line: string; outcome: FreeOutcome; choiceId?: string; verdict?: Verdict; heard?: string; expression?: Expression; thought?: string };

// 보기 목록의 마지막 칸 "내 말로 해 보기". 떠올린 영어가 보기와 같은 표현이면 서버가 그 보기를 알려 주고,
// 아니면 판정·들린 느낌·표정·속마음을 돌려준다. 어느 쪽이든 부모가 내 말을 보기 하나로 더해 다른 보기처럼 고른다(도장·비교·다음으로).
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
  onReset,
  onDraftChange,
  lead = false,
}: {
  n: number;
  open: boolean;
  onOpen: () => void;
  sceneId: string;
  sceneVersion: number;
  step: "base" | "followUp";
  free: FreeLine | null;
  // 보기 id → 화면의 번호와 문장. 대 본 보기를 "2번"처럼 가리킬 때 쓴다. 아직 안 보이는 보기면 번호는 0
  numberOf: (id: string) => { n: number; line: string } | null;
  onSay: (line: string) => void;
  // 결과와 함께 말한 문장을 넘긴다. 보낼 때의 화면 값(아직 비어 있음)에 기대지 않게 한다
  onResult: (r: Omit<FreeLine, "step" | "line">, line: string) => void;
  onReset: () => void;
  onDraftChange?: (draft: string) => void;
  // 보기보다 앞에 둘 때. 눌러서 여는 단계 없이 처음부터 쓰는 칸으로 두고, 번호 대신 연필을 붙인다(번호는 보기의 것이다). 화면에 뜨자마자 자판이 올라오지 않게 자동으로 잡지 않는다
  lead?: boolean;
}) {
  const mark = lead ? (
    <svg width="14" height="14" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden className="fill-current">
      <path d="M6 0h1v1h1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-2h1v-1h1v-1h1v-1h1v-1h1z" />
    </svg>
  ) : (
    n
  );
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
      // 이 칸이 nuanci의 킥이라 보기 셋과 같은 무게의 블록으로 둔다. 예전 점선 칸은 보기의 부록처럼 보여 지나쳤다
      <BlockButton onClick={onOpen} className="w-full text-left" faceClassName="flex items-center gap-3">
        <span aria-hidden className="grid size-6 shrink-0 place-items-center bg-ink font-label text-ui text-white">
          {n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-label-strong text-body">내 말로 해 보기</span>
          <span className="block text-meta text-ink-muted">떠올린 영어를 그대로 말하면 상대가 반응</span>
        </span>
        <svg width="20" height="20" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-current text-ink">
          <path d="M6 0h1v1h1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-2h1v-1h1v-1h1v-1h1v-1h1z" />
        </svg>
      </BlockButton>
    );

  // 말한 뒤의 칸: 내가 한 말을 대사처럼 크게, 그 아래에 결과. Mochi의 한마디는 목록 위 말풍선이 맡는다
  if (free && free.step === step) {
    return (
      <div className="border-2 border-fg bg-card-raised px-3 py-3 text-ink animate-fade">
        <p className="flex items-start gap-3">
          <span aria-hidden className="grid size-6 shrink-0 place-items-center bg-ink font-label text-ui text-white">
            {mark}
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

  // 쓰는 칸: 닫힌 칸이 그대로 한 줄짜리 입력칸이 된다. 번호·입력·말하기가 한 테두리 안에 붙어 하나의 물건으로 보이고,
  // 말한 뒤에는 같은 줄에 같은 글꼴·크기로 내 말이 남는다. 포커스 표시는 안쪽 입력칸이 아니라 바깥 칸 전체에 둔다
  const ready = text.trim().length >= 2;
  return (
    <form
      onSubmit={send}
      className="flex min-h-14 items-stretch border-2 border-fg bg-card-raised text-ink animate-fade focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-4 focus-within:outline-pink"
    >
      <span aria-hidden className="ml-3 grid size-6 shrink-0 place-items-center self-center bg-ink font-label text-ui text-white">
        {mark}
      </span>
      <input
        value={text}
        onChange={(e) => updateText(e.target.value)}
        maxLength={200}
        autoFocus={!lead}
        onFocus={lead ? onOpen : undefined}
        lang="en"
        autoCapitalize="sentences"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="send"
        aria-label="내 말로 해 보기: 떠올린 영어"
        placeholder={lead ? "떠올린 영어 그대로 말해 보기" : "e.g. Break a leg!"}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 font-line text-say leading-snug text-ink caret-ink outline-none placeholder:text-ink-subtle/60 focus-ring-off"
      />
      <button
        type="submit"
        disabled={!ready}
        className={`shrink-0 border-l-2 border-fg px-4 font-label text-ui transition-colors ${ready ? "bg-pink text-ink-fixed active:translate-y-px" : "text-ink-subtle"}`}
      >
        말하기
      </button>
    </form>
  );
}
