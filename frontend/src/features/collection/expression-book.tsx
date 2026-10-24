"use client";

import Link from "next/link";
import { useState } from "react";
import { EntryLink } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { TRAP_LABELS, type Trap } from "@/features/scene/types";
import type { BookEntry, ExpressionPair } from "./pairs";

export function Mark({ good }: { good: boolean }) {
  return (
    <span aria-label={good ? "전달됨" : "사고"} className={`grid size-5 shrink-0 place-items-center font-pixel text-[12px] leading-none text-ink ${good ? "bg-good" : "bg-bad"}`}>
      {good ? "O" : "X"}
    </span>
  );
}

function Arrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="fill-current">
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}

// 표현 한 쌍. 영어 가리기를 켜면 자연스러운 말을 가려 두고, 눌러야 보여준다. 스스로 떠올려 본 뒤 확인하면 더 오래 기억한다
function PairRow({ pair, hidden, onReveal }: { pair: ExpressionPair; hidden: boolean; onReveal: () => void }) {
  return (
    <li className="py-3">
      <p className="text-[12px] text-ink-subtle">
        {pair.who} · {pair.when}
      </p>
      <p className="mt-0.5 text-[13px] text-ink-muted">{pair.intent}</p>
      <p className="mt-1.5 flex items-center gap-2 text-[14px] text-ink-subtle">
        <Mark good={false} />
        <s className="min-w-0">{pair.wrong}</s>
        {pair.trap && <span className="shrink-0 text-[12px]">· {TRAP_LABELS[pair.trap]}</span>}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <Mark good />
        {hidden ? (
          <button type="button" onClick={onReveal} className="min-h-9 flex-1 border-2 border-dashed border-ink/30 px-2 text-left font-pixel text-[13px] text-ink-subtle">
            눌러서 보기
          </button>
        ) : (
          <p className="font-line text-[20px] leading-snug">{pair.right}</p>
        )}
      </div>
    </li>
  );
}

// 끝낸 장면에서 모은 표현을 최근에 한 장면부터 보여준다. 찾기, 틀리는 이유별로 거르기, 영어 가리고 복습하기를 한 화면에서 한다.
// 안 해 본 장면은 칸을 늘어놓지 않고 장면 목록으로 보내는 한 줄로 줄인다
export function ExpressionBook({ entries }: { entries: BookEntry[] }) {
  const cleared = useCleared();
  const [query, setQuery] = useState("");
  const [trap, setTrap] = useState<Trap | null>(null);
  const [hide, setHide] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);

  const byId = new Map(entries.map((e) => [e.id, e]));
  const open = [...cleared].reverse().flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  const lockedCount = entries.length - open.length;
  const count = open.reduce((n, e) => n + e.pairs.length, 0);
  const traps = [...new Set(open.flatMap((e) => e.pairs.flatMap((p) => (p.trap ? [p.trap] : []))))];
  const q = query.trim().toLowerCase();
  const matches = (p: ExpressionPair) => (!trap || p.trap === trap) && (!q || [p.intent, p.right, p.wrong, p.who, p.when].some((t) => t.toLowerCase().includes(q)));
  const shown = open.map((e) => ({ entry: e, pairs: e.pairs.filter(matches) })).filter((g) => g.pairs.length > 0);

  const toggleHide = () => {
    setHide((v) => !v);
    setRevealed([]);
  };

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="font-pixel-title text-[24px]">표현 모음</h1>
        {count > 0 && <p className="shrink-0 font-pixel text-[15px] text-paper-subtle">{count}개</p>}
      </div>

      {count === 0 ? (
        <p className="mt-3 text-[14px] text-paper-muted">장면을 해 보면 표현이 여기 모여요.</p>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="표현 찾기"
              aria-label="표현 찾기"
              className="blk min-h-11 min-w-0 flex-1 bg-cream px-3 text-[15px] text-ink placeholder:text-ink-subtle"
            />
            <button
              type="button"
              onClick={toggleHide}
              aria-pressed={hide}
              className={`blk min-h-11 shrink-0 px-3 font-pixel text-[15px] ${hide ? "bg-gold text-ink" : "bg-slate-block text-paper"}`}
            >
              영어 가리기
            </button>
          </div>

          {traps.length > 1 && (
            <div role="group" aria-label="틀리는 이유" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {[null, ...traps].map((t) => (
                <button
                  key={t ?? "all"}
                  type="button"
                  onClick={() => setTrap(t)}
                  aria-pressed={trap === t}
                  className={`min-h-9 shrink-0 border-2 px-3 font-pixel text-[13px] ${trap === t ? "border-gold bg-gold text-ink" : "border-paper-subtle/40 text-paper-muted"}`}
                >
                  {t ? TRAP_LABELS[t] : "전체"}
                </button>
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <p className="mt-6 text-[14px] text-paper-muted">찾는 표현이 없어요.</p>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {shown.map(({ entry, pairs }) => (
                <section key={entry.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <h2 className="min-w-0 truncate font-pixel text-[15px] text-paper">{entry.title}</h2>
                    <EntryLink href={`/scenes/${entry.number}`} entry="home" className="-mr-1 flex min-h-9 shrink-0 items-center gap-1.5 px-1 font-pixel text-[13px] text-paper-subtle hover:text-paper">
                      다시 하기
                      <Arrow />
                    </EntryLink>
                  </div>
                  <div className="blk-frame">
                    <ul className="blk divide-y-2 divide-ink/10 bg-cream px-4 text-ink">
                      {pairs.map((p) => {
                        const key = `${entry.id}:${p.right}`;
                        return <PairRow key={key} pair={p} hidden={hide && !revealed.includes(key)} onReveal={() => setRevealed((r) => [...r, key])} />;
                      })}
                    </ul>
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {lockedCount > 0 && (
        <Link href="/scenes" className="blk-btn mt-8 block">
          <span className="blk flex items-center justify-between gap-3 bg-slate-block px-4 py-3 text-paper">
            <span>
              <span className="block font-pixel text-[15px]">아직 안 해 본 장면 {lockedCount}개</span>
              <span className="block text-[13px] text-paper-subtle">해 보면 표현이 더 모여요</span>
            </span>
            <Arrow />
          </span>
        </Link>
      )}
    </>
  );
}
