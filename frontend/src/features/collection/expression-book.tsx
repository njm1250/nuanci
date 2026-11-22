"use client";

import { pairLine, sourcesLine } from "@/features/scene/where";
import Link from "next/link";
import { useState } from "react";
import { BlockLink, EntryLink } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { sfx } from "@/features/scene/sfx";
import { TRAP_LABELS, type Trap } from "@/features/scene/types";
import { answerCta } from "@/features/scene/teaser";
import { spoken, type BookEntry, type ExpressionPair } from "./pairs";
import { MapPin } from "@/features/site/map-pin";
import { SceneThumb, ThumbStudio } from "@/features/landing/scene-thumb";
import type { StageSpec } from "@/features/stage/types";

export function Mark({ good }: { good: boolean }) {
  return (
    <span aria-label={good ? "의도대로 들림" : "다르게 들림"} className={`grid size-5 shrink-0 place-items-center font-label text-ui leading-none text-ink ${good ? "bg-good" : "bg-bad"}`}>
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

// 들린 느낌(pair.heard)이 아직 없는 이전 데이터에서는 함정 종류를 상대에게 들린 인상 문구로 바꿔 보여 준다
const TRAP_STAMP: Record<Trap, string> = {
  literal: "직역으로 들림",
  konglish: "콩글리시 오해",
  answer: "엉뚱한 대답",
  textbook: "교과서 말투",
  blunt: "차갑게 들림",
  formal: "거리감 있게 들림",
  context: "분위기와 어긋남",
  misread: "다른 뜻으로 들림",
  culture: "문화 선 넘음",
};

// 표현 한 쌍. 왼쪽(모바일은 위)에 하고 싶던 말과 그때 상황, 오른쪽에 자연스러운 말(다른 자연스러운 말은 '또는'으로) → 틀리기 쉬운 말.
// 복습할 때 한국어와 상황을 먼저 읽고 영어를 떠올리게 한다. 영어 가리기를 켜면 카드처럼 눌러서 뒤집어 보고 다시 가릴 수 있다.
// 출처는 필요할 때만 펼쳐 본다. 늘 펼쳐 두면 긴 사전 이름이 표현보다 길어진다
function PairRow({
  pair,
  study,
  hidden,
  onToggle,
}: {
  pair: ExpressionPair;
  study: boolean;
  hidden: boolean;
  onToggle: () => void;
}) {
  const stamp = pair.heard ?? (pair.trap ? TRAP_STAMP[pair.trap] : null);
  return (
    <li className="grid grid-cols-1 gap-y-3 px-4 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-x-6 md:py-5">
      <div className="min-w-0">
        <p className="text-body font-bold leading-snug text-fg">{spoken(pair.intent)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-meta leading-relaxed text-fg-subtle">
          <MapPin />
          {pairLine(pair.who, pair.when, pair.whenIsPlace)}
        </p>
      </div>
      <div className="min-w-0 md:border-l md:border-line/60 md:pl-6">
        <div className="flex items-start gap-2">
          <span className="mt-1">
            <Mark good />
          </span>
          {hidden ? (
            <button
              type="button"
              onClick={onToggle}
              className="flex min-h-11 flex-1 items-center justify-between gap-2 border-2 border-dashed border-line bg-surface px-3 text-left font-label text-ui text-fg-muted hover:border-fg hover:text-fg"
            >
              <span>영어 보기</span>
              <span aria-hidden className="text-meta text-fg-subtle">뒤집기</span>
            </button>
          ) : study ? (
            <button
              type="button"
              onClick={onToggle}
              aria-label={`${pair.right}, 다시 가리기`}
              className="group min-w-0 flex-1 animate-fade text-left"
            >
              <p className="font-line text-say-lg leading-snug">{pair.right}</p>
              {pair.alts.map((a) => (
                <p key={a} className="font-line text-body leading-snug text-fg-muted">
                  <span className="font-sans text-meta text-fg-subtle">또는 </span>
                  {a}
                </p>
              ))}
              <span className="mt-1 inline-block text-meta text-fg-subtle underline underline-offset-4 group-hover:text-fg">
                다시 가리기
              </span>
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
        <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-body text-fg-subtle">
          <Mark good={false} />
          <s className="min-w-0 decoration-rust decoration-2">{pair.wrong}</s>
          {stamp && (
            <span className="-rotate-2 inline-block shrink-0 border-2 border-ink bg-bad px-1.5 py-0.5 font-label-strong text-meta leading-none text-ink">
              {stamp}
            </span>
          )}
        </p>
        {!hidden && pair.sources && pair.sources.length > 0 && (
          <details className="group/src mt-2 pl-7 text-meta text-fg-subtle">
            <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="transition-transform duration-fast group-open/src:rotate-90">
                <Arrow />
              </span>
              표현 출처
            </summary>
            <p className="leading-relaxed">{sourcesLine(pair.sources)}</p>
          </details>
        )}
      </div>
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
export function ExpressionBook({ entries, stages = {} }: { entries: BookEntry[]; stages?: Record<string, StageSpec> }) {
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
    sfx.tap();
    setHide((v) => !v);
    setRevealed([]);
  };

  const toggleReveal = (key: string) => {
    sfx.tap();
    setRevealed((r) => (r.includes(key) ? r.filter((k) => k !== key) : [...r, key]));
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
            <div role="radiogroup" aria-label="어색한 이유" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
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
            <div className="stagger mt-4 grid grid-cols-1 gap-y-6">
              {shown.map(({ entry, pairs }) => (
                <section key={entry.id} className="border-2 border-fg">
                  {/* 장면 묶음 머리: 작은 장면 그림과 제목으로 어느 장면에서 모은 표현인지 바로 알아보게 한다 */}
                  <div className="flex items-center gap-2.5 border-b-2 border-fg bg-surface px-3 py-2.5 md:gap-3">
                    {stages[entry.id] && <SceneThumb stage={stages[entry.id]} className="aspect-[4/3] w-14 shrink-0 border border-line md:w-16" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-meta text-fg-subtle">표현 {pairs.length}개</p>
                      <h2 className="line-clamp-2 break-keep font-poster text-title leading-snug text-fg">{entry.title}</h2>
                    </div>
                    <EntryLink href={`/scenes/${entry.number}`} entry="home" className="flex min-h-11 shrink-0 items-center gap-1 px-1 font-label text-ui text-fg-muted hover:text-fg">
                      다시 하기
                      <Arrow />
                    </EntryLink>
                  </div>
                  <ul className="divide-y divide-line/60 bg-card">
                    {pairs.map((p) => {
                      const key = `${entry.id}:${p.right}`;
                      return <PairRow key={key} pair={p} study={hide} hidden={hide && !revealed.includes(key)} onToggle={() => toggleReveal(key)} />;
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
      <ThumbStudio />
    </>
  );
}
