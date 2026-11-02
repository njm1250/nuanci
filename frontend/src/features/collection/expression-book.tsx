"use client";

import Link from "next/link";
import { useState } from "react";
import { BlockLink, EntryLink } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { PageTitle } from "@/features/site/page-title";
import { TRAP_LABELS, type Trap } from "@/features/scene/types";
import { spoken, type BookEntry, type ExpressionPair } from "./pairs";

export function Mark({ good }: { good: boolean }) {
  return (
    <span aria-label={good ? "전달됨" : "사고"} className={`grid size-5 shrink-0 place-items-center font-pixel text-[15px] leading-none text-ink ${good ? "bg-good" : "bg-bad"}`}>
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

// 표현 한 쌍. 하고 싶던 말 → 자연스러운 말(다른 자연스러운 말은 '또는'으로) → 틀리기 쉬운 말 순서로, 배울 표현을 가장 크게 둔다.
// 영어 가리기를 켜면 자연스러운 말을 가려 두고 눌러야 보여준다. 스스로 떠올려 본 뒤 확인하면 더 오래 기억한다. 출처는 맨 아래 한 줄로 작게 둔다
function PairRow({ pair, hidden, onReveal }: { pair: ExpressionPair; hidden: boolean; onReveal: () => void }) {
  return (
    <li className="px-3 py-4">
      <p className="text-[16px] font-semibold leading-snug text-paper">{spoken(pair.intent)}</p>
      <div className="mt-2.5 flex items-start gap-2">
        <span className="mt-1">
          <Mark good />
        </span>
        {hidden ? (
          <button type="button" onClick={onReveal} className="min-h-9 flex-1 border border-dashed border-line px-2 text-left font-pixel text-[15px] text-paper-subtle">
            눌러서 보기
          </button>
        ) : (
          <div className="min-w-0">
            <p className="font-line text-[20px] leading-snug">{pair.right}</p>
            {pair.alts.map((a) => (
              <p key={a} className="font-line text-[16px] leading-snug text-paper-muted">
                <span className="font-sans text-[12px] text-paper-subtle">또는 </span>
                {a}
              </p>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 flex items-center gap-2 text-[13px] text-paper-subtle">
        <Mark good={false} />
        <s className="min-w-0">{pair.wrong}</s>
        {pair.trap && <span className="shrink-0 text-[12px]">· {TRAP_LABELS[pair.trap]}</span>}
      </p>
      <p className="mt-3 text-[12px] leading-relaxed text-paper-subtle">
        {pair.who} · {pair.when}
        {!hidden && pair.sources && pair.sources.length > 0 && <span className="block">출처 · {pair.sources.map((s) => `${s.phrase} — ${s.from}`).join(" · ")}</span>}
      </p>
    </li>
  );
}

// 처음 온 사람이 빈 화면에서 멈추지 않게, 첫 장면으로 가는 메인 버튼과 모으게 될 표현 몇 개를 영어만 가린 채 보여 준다.
// 미리 보기는 첫 10화를 스포하지 않게 그 뒤 장면에서 고른다
function EmptyBook({ entries }: { entries: BookEntry[] }) {
  const first = entries[0];
  const peek = entries.slice(10).flatMap((e) => e.pairs.slice(0, 1)).slice(0, 3);
  return (
    <>
      <p className="mt-3 text-[16px] leading-relaxed text-paper-muted">장면을 해 보면 &lsquo;이럴 땐 영어로 이렇게&rsquo;가 여기 모여요.</p>
      {first && (
        <BlockLink href={`/scenes/${first.number}`} entry="home" primary className="mt-5">
          첫 장면 하러 가기
        </BlockLink>
      )}
      {peek.length > 0 && (
        <ul className="mt-8 divide-y divide-line/40 border-t-2 border-paper" aria-hidden>
          {peek.map((p) => (
            <li key={`${p.who}:${p.right}`} className="py-3">
              <p className="text-[14px] text-paper-muted">{p.intent}</p>
              <p className="mt-1 select-none font-line text-[20px] leading-snug blur-[6px]">{p.right}</p>
            </li>
          ))}
        </ul>
      )}
    </>
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
      <PageTitle note="이럴 땐 이렇게">표현 모음</PageTitle>

      {count === 0 ? (
        <EmptyBook entries={entries} />
      ) : (
        <>
          <div className="mt-6 flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="표현 찾기"
              aria-label="표현 찾기"
              className="min-h-11 min-w-0 flex-1 border border-line bg-night-deep px-3 text-[16px] text-paper placeholder:text-paper-subtle light:bg-cream"
            />
            {traps.length > 1 && (
              <select
                value={trap ?? ""}
                onChange={(e) => setTrap((e.target.value || null) as Trap | null)}
                aria-label="틀리는 이유"
                className="min-h-11 w-[120px] shrink-0 border border-line bg-night-deep px-2 text-[14px] text-paper light:bg-cream [color-scheme:dark] light:[color-scheme:light]"
              >
                <option value="">이유 전체</option>
                {traps.map((t) => (
                  <option key={t} value={t}>
                    {TRAP_LABELS[t]}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mt-1 flex min-h-11 items-center justify-between gap-3">
            <label className="flex min-h-11 items-center gap-2 text-[14px] text-paper-muted">
              <input type="checkbox" checked={hide} onChange={toggleHide} className="size-[18px] accent-gold [color-scheme:dark] light:[color-scheme:light]" />
              영어 가리기
            </label>
            <p className="text-[14px] text-paper-subtle">{count}개</p>
          </div>

          {shown.length === 0 ? (
            <p className="mt-6 text-[14px] text-paper-muted">찾는 표현이 없어요.</p>
          ) : (
            <div className="mt-4 grid items-start gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {shown.map(({ entry, pairs }) => (
                <section key={entry.id}>
                  <div className="flex items-center justify-between gap-2 bg-slate-block pl-3 pr-2">
                    <h2 className="min-w-0 truncate font-pixel text-[15px] text-paper">{entry.title}</h2>
                    <EntryLink href={`/scenes/${entry.number}`} entry="home" className="flex min-h-11 shrink-0 items-center gap-1.5 px-1 font-pixel text-[15px] text-paper-muted hover:text-paper">
                      다시 하기
                      <Arrow />
                    </EntryLink>
                  </div>
                  <ul className="divide-y divide-line/40">
                    {pairs.map((p) => {
                      const key = `${entry.id}:${p.right}`;
                      return <PairRow key={key} pair={p} hidden={hide && !revealed.includes(key)} onReveal={() => setRevealed((r) => [...r, key])} />;
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {lockedCount > 0 && count > 0 && (
        <Link href="/scenes" className="blk-btn mt-8 block">
          <span className="blk flex items-center justify-between gap-3 bg-slate-block px-4 py-3 text-paper">
            <span>
              <span className="block font-pixel text-[15px]">아직 안 해 본 장면 {lockedCount}개</span>
              <span className="block text-[14px] text-paper-subtle">해 보면 표현이 더 모여요</span>
            </span>
            <Arrow />
          </span>
        </Link>
      )}
    </>
  );
}
