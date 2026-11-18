"use client";

import { useState } from "react";
import { BlockButton } from "./block-ui";
import { visitorId } from "./track";

type Result = { kind: "match"; id: string; line: string } | { kind: "none" };

// "내가 하려던 영어가 없어요". 하고 싶은 말(한국어)은 이미 생각 풍선에 있으니, 막히는 건 떠올린 영어가 보기에 없을 때다.
// 그 영어를 직접 받아서, 원어민에게 거의 같게 들리는 보기가 있으면 그 보기를 알려 주고 그 보기의 반응을 보게 한다.
// 판정과 해설은 늘 검증된 보기의 것이다. 가까운 보기가 없으면 모아 두고 장면에 넣을지 본다
export function MissingIntent({
  sceneId,
  sceneVersion,
  step,
  choices,
  onPick,
}: {
  sceneId: string;
  sceneVersion: number;
  step: "base" | "followUp";
  choices: { id: string; line: string }[];
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "failed">("idle");
  const [result, setResult] = useState<Result | null>(null);

  if (result?.kind === "match")
    return (
      <div className="mt-3 border-2 border-fg bg-card-raised px-3.5 py-3 text-ink animate-fade">
        <p className="text-note text-ink-muted">
          <span className="font-line text-ui text-ink">&ldquo;{text.trim()}&rdquo;</span>는 이 보기와 거의 같게 들려요
        </p>
        <p className="mt-1 font-line text-say leading-snug">{result.line}</p>
        <BlockButton label onClick={() => onPick(result.id)} className="mt-2.5">
          그 반응 보기
        </BlockButton>
      </div>
    );
  if (result?.kind === "none")
    return (
      <p className="mt-3 text-note leading-relaxed text-fg-muted animate-fade">
        <span className="font-line text-ui text-fg">&ldquo;{text.trim()}&rdquo;</span>는 아직 장면에 없는 말이에요. 모아서 보기로 넣을지 볼게요.
      </p>
    );

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="-mx-1 mt-2 flex min-h-11 items-center px-1 text-note text-fg-subtle underline decoration-fg-subtle/40 underline-offset-4 hover:text-fg">
        내가 하려던 영어가 없어요
      </button>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const said = text.trim();
    if (said.length < 2 || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/missing-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitorId(), sceneId, sceneVersion, step, text: said }),
      });
      if (!res.ok) return setState("failed");
      const { matchedChoiceId } = (await res.json()) as { matchedChoiceId: string | null };
      const hit = choices.find((c) => c.id === matchedChoiceId);
      setResult(hit ? { kind: "match", id: hit.id, line: hit.line } : { kind: "none" });
    } catch {
      setState("failed");
    }
  };

  return (
    <form onSubmit={submit} className="mt-3">
      <label htmlFor="missing-intent" className="block text-note text-fg-muted">
        직접 영어로 써 볼래요?
      </label>
      <div className="mt-1.5 flex items-stretch gap-2">
        <input
          id="missing-intent"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          autoFocus
          autoCapitalize="sentences"
          lang="en"
          placeholder="e.g. Break a leg!"
          className="min-w-0 flex-1 border-2 border-fg bg-card-raised px-3 py-2 font-line text-body text-ink placeholder:text-ink-subtle"
        />
        <BlockButton label type="submit" className="shrink-0">
          {state === "sending" ? "듣는 중" : "말하기"}
        </BlockButton>
      </div>
      {state === "failed" && <p className="mt-1.5 text-note text-bad">보내지 못했어요. 다시 눌러 주세요.</p>}
    </form>
  );
}
