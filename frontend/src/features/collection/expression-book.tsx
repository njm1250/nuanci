"use client";

import { EntryLink } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { TRAP_LABELS } from "@/features/scene/types";
import type { BookEntry } from "./pairs";

function Mark({ good }: { good: boolean }) {
  return (
    <span aria-label={good ? "자연스러워요" : "어색해요"} className={`grid size-5 shrink-0 place-items-center font-pixel text-[12px] leading-none text-ink ${good ? "bg-good" : "bg-bad"}`}>
      {good ? "O" : "X"}
    </span>
  );
}

function Entry({ entry }: { entry: BookEntry }) {
  return (
    <div className="blk-frame h-full">
      <div className="blk h-full bg-cream px-4 py-3 text-ink">
        <p className="font-pixel text-[15px]">{entry.title}</p>
        <p className="text-[13px] text-ink-subtle">
          {entry.relation} · {entry.place}
        </p>
        <ul className="mt-3 space-y-3">
          {entry.pairs.map((p) => (
            <li key={p.right}>
              <p className="text-[13px] text-ink-muted">{p.gist}</p>
              <p className="mt-1 flex items-center gap-2 text-[14px] text-ink-subtle">
                <Mark good={false} />
                <s className="min-w-0">{p.wrong}</s>
                {p.trap && <span className="shrink-0 text-[12px]">· {TRAP_LABELS[p.trap]}</span>}
              </p>
              <p className="mt-1 flex items-center gap-2 text-[16px] font-semibold leading-snug">
                <Mark good />
                {p.right}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Locked({ entry }: { entry: BookEntry }) {
  return (
    <EntryLink href={`/scenes/${entry.number}`} entry="home" className="blk-btn block h-full">
      <span className="blk flex h-full flex-col justify-center bg-slate-block px-4 py-3 text-paper">
        <span className="font-pixel text-[15px]" aria-label="아직 안 해 본 장면">
          ???
        </span>
        <span className="text-[13px] text-paper-subtle">
          {entry.relation} · {entry.place}
        </span>
        <span className="mt-3 font-pixel text-[15px] text-gold">해 보고 표현 열기</span>
      </span>
    </EntryLink>
  );
}

// 끝낸 장면의 표현 쌍을 모아 보여주는 수집 화면. 안 해 본 장면은 잠긴 칸으로 남겨서 다음에 할 이유를 만든다
export function ExpressionBook({ entries }: { entries: BookEntry[] }) {
  const cleared = useCleared();
  const open = entries.filter((e) => cleared.includes(e.id));
  const locked = entries.filter((e) => !cleared.includes(e.id));
  const count = open.reduce((n, e) => n + e.pairs.length, 0);
  const total = entries.reduce((n, e) => n + e.pairs.length, 0);
  return (
    <>
      <div className="flex items-baseline justify-between">
        <p className="text-[14px] text-paper-muted">{open.length > 0 ? "끝낸 장면의 표현이 여기 모여요." : "장면을 끝내면 표현이 여기 모여요."}</p>
        <p className="font-pixel text-[15px] text-paper-subtle">
          <span className="text-gold">{count}</span> / {total}
        </p>
      </div>
      <div className="mt-2 h-2 bg-night-deep" role="progressbar" aria-valuenow={count} aria-valuemax={total} aria-label="모은 표현">
        <div className="h-full bg-gold" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
      </div>
      <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {open.map((e) => (
          <li key={e.id}>
            <Entry entry={e} />
          </li>
        ))}
        {locked.map((e) => (
          <li key={e.id}>
            <Locked entry={e} />
          </li>
        ))}
      </ul>
    </>
  );
}
