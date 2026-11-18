"use client";

import { useState } from "react";
import { BlockButton } from "./block-ui";
import { visitorId } from "./track";

// "하려던 말이 없어요". 보기 셋 중에 내 마음에 맞는 말이 없으면 재미가 식는다. 그 순간 하려던 말을 한국어 한 줄로 받아,
// 같은 의도가 여러 사람에게서 나오면 그 장면의 보기를 고친다. 고르기 흐름을 막지 않게 글자 버튼 하나로만 둔다
export function MissingIntent({ sceneId, sceneVersion, step }: { sceneId: string; sceneVersion: number; step: "base" | "followUp" }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  if (state === "sent") return <p className="mt-3 text-note text-fg-subtle">받았어요. 보기를 고칠 때 볼게요.</p>;

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="-mx-1 mt-2 flex min-h-11 items-center px-1 text-note text-fg-subtle underline decoration-fg-subtle/40 underline-offset-4 hover:text-fg">
        하려던 말이 없어요
      </button>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 2 || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/missing-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitorId(), sceneId, sceneVersion, step, text: text.trim() }),
      });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  };

  return (
    <form onSubmit={submit} className="mt-3">
      <label htmlFor="missing-intent" className="block text-note text-fg-muted">
        이 상황에서 하려던 말을 한국어로 적어 주세요
      </label>
      <div className="mt-1.5 flex items-stretch gap-2">
        <input
          id="missing-intent"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          autoFocus
          placeholder="예: 너무 긴장하지 마, 잘될 거야"
          className="min-w-0 flex-1 border-2 border-fg bg-card-raised px-3 py-2 text-body text-ink placeholder:text-ink-subtle"
        />
        <BlockButton label type="submit" className="shrink-0">
          {state === "sending" ? "보내는 중" : "보내기"}
        </BlockButton>
      </div>
      {state === "failed" && <p className="mt-1.5 text-note text-bad">보내지 못했어요. 다시 눌러 주세요.</p>}
    </form>
  );
}
