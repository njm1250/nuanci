"use client";

import { pairLine, sourcesLine } from "@/features/scene/where";
import { useState } from "react";
import { BlockLink, EntryLink } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { sfx } from "@/features/scene/sfx";
import type { Trap } from "@/features/scene/types";
import { answerCta } from "@/features/scene/teaser";
import { spoken, type BookEntry, type ExpressionPair } from "./pairs";
import { MapPin } from "@/features/site/map-pin";
import { SceneThumb, ThumbStudio } from "@/features/landing/scene-thumb";
import type { StageSpec } from "@/features/stage/types";
import { useFirstAnswers } from "@/features/progression/voice";
import { groupOf, OTHER_GROUP, SCENE_GROUPS } from "@/features/landing/scene-groups";
import { FEATURE_LIST, isFeatureSlug } from "@/features/scene/collections";
import type { SceneCategory } from "@/features/scene/types";

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

// 도감의 1인칭 소감: 그 질문에서 내가 처음 고른 답이 어땠는지 한 줄로. 표현(건조한 정보) 아래에 내 이야기로 붙는다
const FIRST_TIME: Record<Trap, string> = {
  literal: "처음엔 한국어 그대로 옮겼었지",
  konglish: "처음엔 콩글리시로 말했었지",
  answer: "처음엔 대답이 엇갈렸었지",
  textbook: "처음엔 교과서처럼 말했었지",
  blunt: "처음엔 너무 세게 말했었지",
  formal: "처음엔 너무 딱딱하게 말했었지",
  context: "처음엔 분위기에 안 맞게 말했었지",
  misread: "처음엔 다른 뜻으로 들렸었지",
  culture: "처음엔 문화 차이에 걸렸었지",
};

// 표현 한 쌍. 왼쪽(모바일은 위)에 하고 싶던 말과 그때 상황, 오른쪽에 자연스러운 말(다른 자연스러운 말은 '또는'으로) → 틀리기 쉬운 말.
// 복습할 때 한국어와 상황을 먼저 읽고 영어를 떠올리게 한다. 영어 가리기를 켜면 카드처럼 눌러서 뒤집어 보고 다시 가릴 수 있다.
// 출처는 필요할 때만 펼쳐 본다. 늘 펼쳐 두면 긴 사전 이름이 표현보다 길어진다
function PairRow({
  pair,
  study,
  hidden,
  onToggle,
  first,
}: {
  pair: ExpressionPair;
  study: boolean;
  hidden: boolean;
  onToggle: () => void;
  // 이 질문의 내 첫 답. 없으면(예전 기록) 소감을 붙이지 않는다
  first?: Trap | "good";
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
        {first && (
          <p className="mt-2.5 flex items-center gap-1.5 text-meta text-fg-subtle">
            {first === "good" ? (
              <>
                <span className="-rotate-3 inline-block border-2 border-ink bg-good px-1 py-px font-label-strong leading-none text-ink">한 번에</span>
                처음부터 맞혔어!
              </>
            ) : (
              <>{FIRST_TIME[first]}</>
            )}
          </p>
        )}
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

// 표현 도감. 동물의 숲 도감처럼 상황별 탭으로 나누고, 장면 순서(도감 번호)대로 늘어놓는다.
// 한 칸의 상태는 셋: 아직 못 만남(물음표 칸, 맨 아래 격자), 만남(표현이 보임), 한 번에 맞힘('한 번에' 도장). 위에는 모은 비율 막대.
// 찾기를 쓰면 탭과 상관없이 모은 표현 전체에서 찾고, 못 만난 칸은 숨긴다
const ALL = "전체";

function groupLabel(e: BookEntry, stages: Record<string, StageSpec>, categories: Record<string, SceneCategory>) {
  const c = categories[e.id];
  if (c && isFeatureSlug(c)) return FEATURE_LIST.find((f) => f.slug === c)?.name ?? OTHER_GROUP;
  return groupOf(e.relation, stages[e.id]?.set, c);
}

export function ExpressionBook({
  entries,
  stages = {},
  categories = {},
}: {
  entries: BookEntry[];
  stages?: Record<string, StageSpec>;
  categories?: Record<string, SceneCategory>;
}) {
  const cleared = useCleared();
  const firsts = useFirstAnswers();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(ALL);
  const [hide, setHide] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);

  const done = new Set(cleared);
  const labelOf = new Map(entries.map((e) => [e.id, groupLabel(e, stages, categories)]));
  const order = [...FEATURE_LIST.map((f) => f.name), ...SCENE_GROUPS.map((g) => g.label), OTHER_GROUP];
  const labels = [...new Set(entries.map((e) => labelOf.get(e.id)!))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const total = entries.reduce((n, e) => n + e.pairs.length, 0);
  const count = entries.filter((e) => done.has(e.id)).reduce((n, e) => n + e.pairs.length, 0);
  const tally = (label: string) => {
    const list = entries.filter((e) => label === ALL || labelOf.get(e.id) === label);
    return { got: list.filter((e) => done.has(e.id)).reduce((n, e) => n + e.pairs.length, 0), all: list.reduce((n, e) => n + e.pairs.length, 0) };
  };
  const q = query.trim().toLowerCase();
  const matches = (p: ExpressionPair) => !q || [p.intent, p.right, p.wrong, p.who, p.when].some((t) => t.toLowerCase().includes(q));
  const inTab = entries.filter((e) => q || tab === ALL || labelOf.get(e.id) === tab);
  const shown = inTab
    .map((e) => ({ entry: e, open: done.has(e.id), pairs: done.has(e.id) ? e.pairs.filter(matches) : [] }))
    .filter((g) => g.open && g.pairs.length > 0);
  // 도감 번호: 전체 장면 순서에서 몇 번째인지
  const noOf = new Map(entries.map((e, i) => [e.id, i + 1]));
  const locked = q ? [] : inTab.filter((e) => !done.has(e.id));
  const stepOf = (e: BookEntry, i: number) => (e.pairs.length === 2 ? (i === 0 ? "base" : "followUp") : null);

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
          {/* 모은 비율: 도감을 얼마나 채웠는지 한 줄 막대로 */}
          <div className="mb-4">
            <p className="flex items-baseline justify-between text-note text-fg-muted">
              <span>모은 표현</span>
              <span>
                <span className="font-bold text-fg">{count}</span> / {total}
              </span>
            </p>
            <div role="progressbar" aria-label="모은 표현" aria-valuenow={count} aria-valuemax={total} className="mt-1.5 h-2.5 border-2 border-fg bg-card">
              <div className="h-full bg-pink" style={{ width: `${Math.round((count / Math.max(total, 1)) * 100)}%` }} />
            </div>
          </div>

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

          {/* 상황별 탭: 누구와 어디서 말하는지로 나눈다. 탭마다 모은 수 / 전체 수. 모바일은 옆으로 넘긴다 */}
          {!q && labels.length > 1 && (
            <div role="tablist" aria-label="상황" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {[ALL, ...labels].map((label) => {
                const on = tab === label;
                const t = tally(label);
                return (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(label)}
                    className={`flex min-h-11 shrink-0 items-center gap-1.5 border-2 px-3 font-label text-ui ${on ? "border-fg bg-fg text-page" : "border-line text-fg-muted hover:border-fg hover:text-fg"}`}
                  >
                    {label}
                    <span className={`text-meta ${on ? "text-page/70" : "text-fg-subtle"}`}>
                      {t.got}/{t.all}
                    </span>
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
          </div>

          {shown.length === 0 ? (
            q ? <p className="mt-6 text-note text-fg-muted">찾는 표현이 없어요.</p> : null
          ) : (
            <div className="stagger mt-4 grid grid-cols-1 gap-y-6">
              {shown.map(({ entry, open, pairs }) =>
                open ? (
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
                        const step = stepOf(entry, entry.pairs.indexOf(p));
                        return (
                          <PairRow
                            key={key}
                            pair={p}
                            study={hide}
                            hidden={hide && !revealed.includes(key)}
                            onToggle={() => toggleReveal(key)}
                            first={step ? firsts[`${entry.id}:${step}`] : undefined}
                          />
                        );
                      })}
                    </ul>
                  </section>
                ) : null,
              )}
            </div>
          )}
          {/* 아직 못 만난 장면: 동물의 숲 도감의 빈 칸처럼 작은 물음표 칸을 격자로 모은다. 번호는 도감 번호(장면 순서), 누르면 그 장면으로 */}
          {locked.length > 0 && (
            <>
              <p className="mt-8 text-note text-fg-muted">
                아직 못 만난 표현 <span className="font-bold text-fg">{locked.reduce((n, e) => n + e.pairs.length, 0)}</span>개
              </p>
              <ul className="mt-2 grid grid-cols-4 gap-2 md:grid-cols-6">
                {locked.map((e) => (
                  <li key={e.id}>
                    <EntryLink href={`/scenes/${e.number}`} entry="home" aria-label={`${noOf.get(e.id)}번 칸, 장면 해 보기`} className="group relative block aspect-[4/3] overflow-hidden border-2 border-dashed border-line hover:border-fg">
                      {stages[e.id] && <SceneThumb stage={stages[e.id]} className="absolute inset-0 size-full opacity-25 grayscale" />}
                      <span className="absolute inset-0 grid place-items-center font-poster text-title text-fg-subtle group-hover:text-fg">?</span>
                      <span className="absolute left-1 top-0.5 text-meta text-fg-subtle">{noOf.get(e.id)}</span>
                    </EntryLink>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <ThumbStudio />
    </>
  );
}
