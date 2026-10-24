"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reorderScenes } from "./actions";
import type { AdminScene } from "./api";
import { StatusChip } from "./status-chip";

const PAGE = 10;

function ArrowButton({ up, disabled, onClick, label }: { up: boolean; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="grid h-11 w-9 shrink-0 place-items-center text-ink disabled:opacity-25">
      <svg width="14" height="14" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className={`fill-current ${up ? "-rotate-90" : "rotate-90"}`}>
        <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
      </svg>
    </button>
  );
}

// 장면 목록 순서를 10개씩 나눠 보며 바꾸고 한 번에 저장한다. 위치 선택으로 다른 쪽 페이지로도 바로 옮길 수 있다
export function OrderEditor({ scenes }: { scenes: AdminScene[] }) {
  const router = useRouter();
  const byId = new Map(scenes.map((s) => [s.id, s]));
  const original = scenes.map((s) => s.id);
  const [ids, setIds] = useState(original);
  const [page, setPage] = useState(0);
  const [moved, setMoved] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const pages = Math.max(1, Math.ceil(ids.length / PAGE));
  const dirty = ids.some((id, i) => id !== original[i]);

  // 옮긴 장면을 따라 그 장면이 있는 페이지로 넘어간다
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    setIds(next);
    setMoved(id);
    setPage(Math.floor(to / PAGE));
    setMessage(null);
  };

  const save = () =>
    startTransition(async () => {
      const result = await reorderScenes(ids);
      if (result.error) return setMessage({ ok: false, text: result.error });
      setMessage({ ok: true, text: "저장했어요. 사이트에 바로 반영돼요." });
      router.refresh();
    });

  return (
    <>
      <nav className="mt-5 flex flex-wrap gap-2" aria-label="페이지">
        {Array.from({ length: pages }, (_, p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPage(p)}
            aria-current={p === page}
            className={`min-h-11 px-3 font-pixel text-[15px] ${p === page ? "bg-paper text-ink" : "bg-slate-block text-paper-muted"}`}
          >
            {p * PAGE + 1}–{Math.min((p + 1) * PAGE, ids.length)}
          </button>
        ))}
      </nav>

      <ol className="mt-4 space-y-3">
        {ids.slice(page * PAGE, (page + 1) * PAGE).map((id, k) => {
          const i = page * PAGE + k;
          const s = byId.get(id)!;
          const was = original.indexOf(id);
          return (
            <li key={id} className={`blk-frame ${s.status === "hidden" ? "opacity-60" : ""}`}>
              <div className="blk flex items-center gap-2 bg-cream py-1 pl-2 pr-0 text-ink">
                <span className={`grid h-7 min-w-7 shrink-0 place-items-center px-1 font-pixel text-[15px] tabular-nums ${moved === id ? "bg-gold" : ""}`}>{i + 1}</span>
                <span className="min-w-0 flex-1 py-2">
                  <span className="flex items-center gap-2">
                    <StatusChip status={s.status} />
                    <span className="truncate text-[15px] font-semibold">{s.title}</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink-subtle">
                    /scenes/{s.number}
                    {was !== i && ` · 원래 ${was + 1}번째`}
                  </span>
                </span>
                <select
                  value={i}
                  onChange={(e) => move(i, Number(e.target.value))}
                  aria-label={`${s.title} 위치`}
                  className="h-11 w-12 shrink-0 bg-transparent text-[14px] tabular-nums"
                >
                  {ids.map((_, n) => (
                    <option key={n} value={n}>
                      {n + 1}
                    </option>
                  ))}
                </select>
                <ArrowButton up label={`${s.title} 위로`} disabled={i === 0} onClick={() => move(i, i - 1)} />
                <ArrowButton up={false} label={`${s.title} 아래로`} disabled={i === ids.length - 1} onClick={() => move(i, i + 1)} />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t-[3px] border-night-deep bg-night py-4">
        <button type="button" onClick={save} disabled={!dirty || pending} className="blk-btn blk-btn-gold block flex-1 disabled:opacity-40">
          <span className="blk block bg-gold px-3 py-3 text-center font-pixel text-[15px] text-ink">{pending ? "저장 중…" : "순서 저장"}</span>
        </button>
        <button
          type="button"
          onClick={() => (setIds(original), setMoved(null), setMessage(null))}
          disabled={!dirty || pending}
          className="min-h-11 px-2 font-pixel text-[15px] text-paper-muted underline underline-offset-4 disabled:opacity-40"
        >
          되돌리기
        </button>
      </div>
      {message && <p className={`text-[13px] ${message.ok ? "text-good" : "text-rust"}`}>{message.text}</p>}
    </>
  );
}
