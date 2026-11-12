"use client";

import Link from "next/link";
import { useState } from "react";
import { BlockLink, EntryLink } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { TRAP_LABELS, type Trap } from "@/features/scene/types";
import { answerCta } from "@/features/scene/teaser";
import { spoken, type BookEntry, type ExpressionPair } from "./pairs";

export function Mark({ good }: { good: boolean }) {
  return (
    <span aria-label={good ? "전달됨" : "사고"} className={`grid size-5 shrink-0 place-items-center font-label text-ui leading-none text-ink ${good ? "bg-good" : "bg-bad"}`}>
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

// 도트 돋보기. 찾기 칸 앞에 둔다
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-current text-ink-subtle">
      <path d="M2 0h3v1H2zM1 1h1v1H1zM5 1h1v1H5zM0 2h1v3H0zM6 2h1v3H6zM1 5h1v1H1zM5 5h1v1H5zM2 6h3v1H2zM6 6h1v1H6zM7 7h1v1H7zM8 8h1v1H8z" />
    </svg>
  );
}

// 표현 한 쌍. 하고 싶던 말 → 자연스러운 말(다른 자연스러운 말은 '또는'으로) → 틀리기 쉬운 말 순서로, 배울 표현을 가장 크게 둔다.
// 영어 가리기를 켜면 자연스러운 말을 가려 두고 눌러야 보여준다. 스스로 떠올려 본 뒤 확인하면 더 오래 기억한다. 출처는 맨 아래 한 줄로 작게 둔다
function PairRow({ pair, hidden, onReveal }: { pair: ExpressionPair; hidden: boolean; onReveal: () => void }) {
  return (
    <li className="px-3 py-4">
      {/* 하고 싶던 말은 정답 위에 바짝 붙는 보조 질문, 영어 정답이 주인공이다 */}
      <p className="text-note leading-snug text-fg-muted">{spoken(pair.intent)}</p>
      <div className="mt-1 flex items-start gap-2">
        <span className="mt-1">
          <Mark good />
        </span>
        {hidden ? (
          <button type="button" onClick={onReveal} className="min-h-9 flex-1 border border-dashed border-line px-2 text-left font-label text-ui text-fg-subtle">
            눌러서 보기
          </button>
        ) : (
          <div className="min-w-0">
            <p className="font-line text-say-lg leading-snug">{pair.right}</p>
            {pair.alts.map((a) => (
              <p key={a} className="font-line text-body leading-snug text-fg-muted">
                <span className="font-sans text-meta text-fg-subtle">또는 </span>
                {a}
              </p>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1.5 flex items-center gap-2 text-note text-fg-subtle">
        <Mark good={false} />
        <s className="min-w-0 decoration-rust decoration-2">{pair.wrong}</s>
        {pair.trap && <span className="shrink-0 text-meta">· {TRAP_LABELS[pair.trap]}</span>}
      </p>
      <p className="mt-3.5 text-meta leading-relaxed text-fg-subtle">
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
      <p className="mt-3 text-body leading-relaxed text-fg-muted">장면을 해 보면 &lsquo;이럴 땐 영어로 이렇게&rsquo;가 여기 모여요.</p>
      {first && (
        <BlockLink href={`/scenes/${first.number}`} entry="home" primary className="mt-5 md:max-w-[400px]">
          {answerCta(first.relation)}
        </BlockLink>
      )}
      {peek.length > 0 && (
        <ul className="mt-8 divide-y divide-line/40 border-t-2 border-fg" aria-hidden>
          {peek.map((p) => (
            <li key={`${p.who}:${p.right}`} className="py-3">
              <p className="text-note text-fg-muted">{p.intent}</p>
              <p className="mt-1 select-none font-line text-say leading-snug blur-[6px]">{p.right}</p>
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
  const shownCount = shown.reduce((n, g) => n + g.pairs.length, 0);
  const trapCount = new Map<Trap, number>();
  for (const p of open.flatMap((e) => e.pairs)) if (p.trap) trapCount.set(p.trap, (trapCount.get(p.trap) ?? 0) + 1);

  const toggleHide = () => {
    setHide((v) => !v);
    setRevealed([]);
  };

  return (
    <>

      {count === 0 ? (
        <EmptyBook entries={entries} />
      ) : (
        <>
          {/* 찾기: 사이트의 다른 칸처럼 2px 선, 앞에 돋보기, 글이 있으면 지우기 버튼. 포커스 표시는 안쪽 입력칸이 아니라 바깥 칸 전체에 둔다 */}
          <div className="flex min-h-12 items-center gap-2 border-2 border-fg bg-card-raised px-3 text-ink focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-4 focus-within:outline-pink">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="영어나 한국어, 상황으로 찾기"
              aria-label="표현 찾기"
              className="min-w-0 flex-1 bg-transparent py-2 text-body text-ink outline-none placeholder:text-ink-subtle focus-ring-off [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="찾는 말 지우기" className="-mr-2 grid size-11 place-items-center text-ink-subtle hover:text-ink">
                <span aria-hidden className="text-title leading-none">×</span>
              </button>
            )}
          </div>

          {/* 틀리는 이유: 열어 봐야 보이는 목록 대신, 이유마다 몇 개인지 붙은 칸을 한 줄로 늘어놓는다. 모바일은 옆으로 넘긴다 */}
          {traps.length > 1 && (
            <div role="radiogroup" aria-label="틀리는 이유" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {[{ value: null, label: "전체", n: count }, ...traps.map((t) => ({ value: t, label: TRAP_LABELS[t], n: trapCount.get(t) ?? 0 }))].map((o) => {
                const on = trap === o.value;
                return (
                  <button
                    key={o.label}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setTrap(o.value)}
                    className={`flex min-h-11 shrink-0 items-center gap-1.5 border-2 px-3 font-label text-ui ${on ? "border-fg bg-fg text-page" : "border-line text-fg-muted hover:border-fg hover:text-fg"}`}
                  >
                    {o.label}
                    <span className={`text-meta ${on ? "text-page/70" : "text-fg-subtle"}`}>{o.n}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-2 flex min-h-11 items-center justify-between gap-3">
            {/* 영어 가리기는 다른 설정과 같은 켜고 끄기 스위치로 */}
            <button type="button" role="switch" aria-checked={hide} onClick={toggleHide} className="flex min-h-11 items-center gap-2.5 text-note text-fg-muted">
              <span className={`flex h-6 w-11 items-center p-0.5 ${hide ? "justify-end bg-pink" : "justify-start bg-fg/20"}`}>
                <span className={`size-5 ${hide ? "bg-ink" : "bg-fg"}`} />
              </span>
              영어 가리기
            </button>
            <p className="text-note text-fg-subtle">{shownCount === count ? `${count}개` : `${count}개 중 ${shownCount}개`}</p>
          </div>

          {shown.length === 0 ? (
            <p className="mt-6 text-note text-fg-muted">찾는 표현이 없어요.</p>
          ) : (
            <div className="stagger mt-4 grid grid-cols-1 items-start gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {shown.map(({ entry, pairs }) => (
                <section key={entry.id}>
                  {/* 장면 묶음 머리는 단어장 인덱스 탭처럼, 굵은 줄 위에 제목 탭을 올린다 */}
                  <div className="flex items-end justify-between gap-2 border-b-2 border-fg">
                    <h2 className="min-w-0 truncate bg-fg px-3 py-2 font-label text-ui text-page">{entry.title}</h2>
                    <EntryLink href={`/scenes/${entry.number}`} entry="home" className="flex min-h-11 shrink-0 items-center gap-1.5 px-1 font-label text-ui text-fg-muted hover:text-fg">
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
          <span className="blk flex items-center justify-between gap-3 bg-surface-strong px-4 py-3 text-fg">
            <span>
              <span className="block font-label text-ui">아직 안 해 본 장면 {lockedCount}개</span>
              <span className="block text-note text-fg-subtle">해 보면 표현이 더 모여요</span>
            </span>
            <Arrow />
          </span>
        </Link>
      )}
    </>
  );
}
