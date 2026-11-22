"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BlockLink, EntryLink } from "@/features/scene/block-ui";
import { isFeatureSlug, upNext, type Feature } from "@/features/scene/collections";
import { RUN_SIZE, useRun } from "@/features/scene/run";
import { answerCta } from "@/features/scene/teaser";
import { sceneLine } from "@/features/scene/where";
import { Mascot } from "@/features/mascot/mascot";
import { VoiceCard } from "@/features/progression/voice-card";
import { ReviewToday } from "@/features/review/review-today";
import { featuresIn, useSeason } from "@/features/season/season";
import { CoverSnow } from "@/features/season/season-decor";
import { XmasBanner } from "@/features/season/xmas-banner";
import { DevPackBanner } from "./dev-pack-banner";
import { FEATURES } from "@/features/site/lean";
import type { StageSpec } from "@/features/stage/types";
import {
  Arrow,
  FeaturedScene,
  GROUP_STAGES,
  laneOrder,
  NextGoal,
  PAIRS_PER_SCENE,
  SCENE_ROW_ITEM_CLASS,
  SCENE_ROWS_CLASS,
  SceneCard,
  SceneRow,
  TodayGoals,
  useReviewAfter,
  useVisitor,
  type ShelfScene,
} from "./landing-progress";
import { SceneThumb, ThumbStudio } from "./scene-thumb";
import { groupOf, OTHER_GROUP, SCENE_GROUPS } from "./scene-groups";

// "다음 장면 하나 + 모음" 구조의 홈(다시 온 사람)과 전체 장면. 화 번호·묶음·잠금 없이 장면은 제목과 그림으로 부르고,
// 상황별 묶음과 특집(collections.ts)을 같은 "모음" 모양으로 보여 준다. 예전 화면은 site/lean.ts의 FEATURES.episodes로 다시 켠다

type Lane = { key: string; feature: Feature; scenes: ShelfScene[]; done: number; next: ShelfScene | null; cover?: StageSpec };
type Group = { label: string; scenes: ShelfScene[] };

const noSubscribe = () => () => {};
const countDone = (list: ShelfScene[], cleared: string[]) => list.filter((s) => cleared.includes(s.id)).length;

// 시즌 특집은 기간 중(live)과 지난 것(past)으로, 상시 팩(packs)은 따로, 나머지 장면은 상황별로 나눈다. 특집 장면은 상황별에 다시 넣지 않는다
function useLanes(scenes: ShelfScene[], cleared: string[]) {
  const season = useSeason();
  const of = (f: Feature) => scenes.filter((s) => s.category === f.slug);
  const lane = (f: Feature): Lane => {
    const list = of(f);
    return { key: f.slug, feature: f, scenes: list, done: countDone(list, cleared), next: list.find((s) => !cleared.includes(s.id)) ?? null, cover: f.cover ?? list[0]?.stage };
  };
  const has = (f: Feature) => of(f).length > 0;
  const general = scenes.filter((s) => !isFeatureSlug(s.category));
  const groups: Group[] = [...SCENE_GROUPS.map((g) => g.label), OTHER_GROUP]
    .map((label) => ({ label, scenes: general.filter((s) => groupOf(s.relation, s.stage?.set, s.category) === label) }))
    .filter((g) => g.scenes.length > 0);
  return {
    live: featuresIn(season, "live", (f) => f.kind === "season" && has(f)).map(lane),
    past: featuresIn(season, "past", has).map(lane),
    packs: featuresIn(season, "live", (f) => f.kind === "pack" && has(f)).map(lane),
    groups,
  };
}

const progressNote = (total: number, done: number) => (done > 0 ? `${total}개 중 ${done}개 해 봄` : `장면 ${total}개`);

// 홈 둘째 자리의 특집 카드. 표지 그림, 이름, 몇 개 해 봤는지. 누르면 특집의 안 해 본 첫 장면으로 간다
function FeatureCard({ lane, className = "" }: { lane: Lane; className?: string }) {
  const target = lane.next ?? lane.scenes[0];
  return (
    <EntryLink href={`/scenes/${target.number}`} entry="home" className={`blk-btn block ${className}`}>
      <span className="blk flex items-center gap-3 bg-card-raised p-2 pr-3 text-ink md:gap-4">
        <span className="relative w-[120px] shrink-0 md:w-[168px]">
          <SceneThumb stage={lane.cover} className="aspect-[4/3] w-full border-2 border-line" />
          <CoverSnow decor={lane.feature.decor} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-title font-bold leading-snug">{lane.feature.name}</span>
          <span className="mt-1 block text-meta text-ink-subtle">{progressNote(lane.scenes.length, lane.done)}</span>
        </span>
        <Arrow />
      </span>
    </EntryLink>
  );
}

// 상황별로 고르기. 홈 둘째 자리에 못 들어간 기간 중 특집이 맨 앞 타일로 온다
function CollectionTiles({ lanes, groups, cleared }: { lanes: Lane[]; groups: Group[]; cleared: string[] }) {
  const tiles = [
    ...lanes.map((l) => ({ key: l.key, label: l.feature.name, stage: l.cover, total: l.scenes.length, done: l.done, decor: l.feature.decor })),
    ...groups
      .filter((g) => g.label !== OTHER_GROUP)
      .map((g) => ({ key: g.label, label: g.label, stage: GROUP_STAGES[g.label] ?? g.scenes[0].stage, total: g.scenes.length, done: countDone(g.scenes, cleared), decor: "off" as const })),
  ].slice(0, 8);
  if (tiles.length < 2) return null;
  return (
    <>
      <p className="mt-8 text-body font-bold">상황별로 고르기</p>
      <ul className="-mx-4 mt-2 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {tiles.map((t) => (
          <li key={t.key} className="w-[148px] shrink-0 snap-start lg:w-auto">
            <Link href={`/scenes?group=${encodeURIComponent(t.key)}`} className="group block">
              <span className="relative block">
                <SceneThumb stage={t.stage} className="aspect-[4/3] w-full border-2 border-line transition-colors group-hover:border-ink" />
                <CoverSnow decor={t.decor} />
              </span>
              <span className="mt-2 block truncate text-ui font-bold leading-[1.35]">{t.label}</span>
              <span className="mt-0.5 block text-meta leading-[1.35] text-fg-subtle">
                장면 {t.total}개{t.done > 0 && ` · ${t.done}개 해 봄`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

// 잠금을 겪었던 사람(장면 10개 이상)에게 한 번만, Mochi가 이제 모든 장면이 열려 있다고 알려 준다. 처음 본 순간 본 것으로 적어 두고, 이번 방문 동안은 그대로 둔다.
// 다시 온 사람으로 판단된 뒤(하이드레이션 뒤)에 그려지므로 처음 읽는 값이 이 기기의 실제 기록이다
const ALL_OPEN_KEY = "nuanci.allOpenSeen";
const LOCK_MET = 10;
function seenAllOpen() {
  try {
    return localStorage.getItem(ALL_OPEN_KEY) !== null;
  } catch {
    return true;
  }
}

function AllOpenNotice({ done }: { done: number }) {
  const seen = useSyncExternalStore(noSubscribe, seenAllOpen, () => true);
  const [unseen] = useState(!seen);
  const show = unseen && done >= LOCK_MET;
  useEffect(() => {
    if (!show) return;
    try {
      localStorage.setItem(ALL_OPEN_KEY, "1");
    } catch {}
  }, [show]);
  if (!show) return null;
  return (
    <div className="mb-3 flex items-end gap-2.5">
      <Mascot scale={2} className="shrink-0" />
      <Link href="/scenes" className="blk-frame-sm mb-2 animate-pop">
        <span className="blk flex items-center gap-1.5 whitespace-nowrap bg-white px-2.5 py-1.5 text-note font-bold leading-none text-ink-fixed">
          이제 모든 장면이 열려 있어!
          <Arrow />
        </span>
      </Link>
    </div>
  );
}

// 다시 온 방문자의 홈. 다음 장면 → 둘째 자리(기간 중 특집 하나, 없으면 다른 장면) → 상황별 → 내 기록
export function HomeShelf({ scenes }: { scenes: ShelfScene[] }) {
  const { returning, cleared, fresh } = useVisitor(scenes);
  const run = useRun();
  const reviewAfter = useReviewAfter();
  const { live, packs, groups } = useLanes(scenes, cleared);
  if (!returning) return null;
  const order = laneOrder(scenes);
  // 방금 한 장면은 기록의 마지막 장면이다. 특집·연속극 안이면 그 모음을 이어 간다
  const next = upNext(order, cleared, cleared.at(-1));
  const [lead, ...rest] = live;
  const others = order.filter((s) => !isFeatureSlug(s.category) && s.id !== next?.id && !cleared.includes(s.id)).slice(0, 4);
  // 하던 장면 셋이 있을 때만 "내 영어 말투"까지의 세 칸 막대를 그림 위에 단다(개발자 팩은 셋으로 세지 않는다)
  const runDone = FEATURES.run && next && next.category !== "dev" && run.scenes.length > 0 && run.scenes.length < RUN_SIZE ? run.scenes.length : undefined;
  const done = countDone(scenes, cleared);
  return (
    // 데스크톱은 왼쪽 넓은 칸에 할 장면과 모음을, 오른쪽 좁은 칸에 내 기록을 둔다. 모바일은 할 장면이 먼저다
    <section className="flex animate-fade flex-col px-4 pb-2 pt-7 md:px-0 md:pb-6 md:pt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-10">
      <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-1">
        <h2 className="mb-2 text-body font-bold lg:hidden">{next ? "이어서 할 장면" : "모든 장면을 다 해 봤어요"}</h2>
        {next ? (
          <FeaturedScene scene={next} fresh={fresh.includes(next.id)} run={runDone} />
        ) : (
          <BlockLink href={`/scenes/${order.find((s) => !isFeatureSlug(s.category))?.number ?? 1}`} entry="home" primary className="mt-4">
            처음부터 다시 하기
          </BlockLink>
        )}
        {lead ? (
          lead.feature.slug === "xmas" ? (
            <XmasBanner scenes={lead.scenes} next={lead.next} done={lead.done} className="mt-8" />
          ) : (
            <FeatureCard lane={lead} className="mt-8" />
          )
        ) : (
          others.length > 0 && (
            <>
              <p className="mt-8 text-body font-bold">다른 장면</p>
              <ul className="stagger mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                {/* 모바일은 두 개만, 넓은 왼쪽 칸이 생기는 데스크톱은 네 개까지 */}
                {others.map((s, i) => (
                  <li key={s.id} className={i >= 2 ? "max-lg:hidden" : undefined}>
                    <SceneCard scene={s} done={false} fresh={fresh.includes(s.id)} />
                  </li>
                ))}
              </ul>
            </>
          )
        )}
        <CollectionTiles lanes={rest} groups={groups} cleared={cleared} />
      </div>
      <div className="contents lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-6">
        {FEATURES.review && !reviewAfter && <ReviewToday className="order-1 mb-7 lg:mb-0" />}
        <div className="order-4 mt-8 lg:mt-0 lg:border-2 lg:border-ink lg:bg-card-raised lg:p-4">
          {FEATURES.streak ? <TodayGoals bare /> : <VoiceCard compact />}
          {FEATURES.rewards && <NextGoal />}
        </div>
        {FEATURES.review && reviewAfter && <ReviewToday className="order-3 mt-8 lg:mt-0" />}
        <div className="order-5 mt-6 lg:mt-0">
          <AllOpenNotice done={cleared.length} />
          <div className="blk-frame blk-strong">
            <ul className="blk divide-y-2 divide-ink/10 bg-card-raised text-ink">
              <li>
                <Link href="/expressions" className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink/5">
                  <span>
                    <span className="block text-body font-semibold">표현 모음</span>
                    <span className="mt-0.5 block text-meta text-ink-subtle">모은 표현 {done * PAIRS_PER_SCENE}개</span>
                  </span>
                  <Arrow />
                </Link>
              </li>
              <li>
                <Link href="/scenes" className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink/5">
                  <span>
                    <span className="block text-body font-semibold">전체 장면</span>
                    <span className="mt-0.5 block text-meta text-ink-subtle">장면 {scenes.length}개</span>
                  </span>
                  <Arrow />
                </Link>
              </li>
            </ul>
          </div>
        </div>
        {/* 상시 팩은 메인 경로가 아니라 오른쪽 칸(모바일은 바로 가기 아래) 맨 아래 배너로만 둔다 */}
        {packs.some((l) => l.key === "dev") && <DevPackBanner className="blk-strong order-6 mt-5 lg:mt-0" />}
      </div>
      <ThumbStudio />
    </section>
  );
}

// 전체 장면 맨 위의 다음 장면 한 줄. 버튼은 홈과 같은 행동 문구다
function NextRow({ next, restart }: { next: ShelfScene | null; restart?: ShelfScene }) {
  if (!next)
    return (
      <section aria-label="다음 장면" className="border-2 border-fg bg-card-raised p-4 text-ink md:flex md:items-center md:justify-between md:gap-4">
        <p className="text-body font-bold">모든 장면을 다 해 봤어요</p>
        {restart && (
          <BlockLink href={`/scenes/${restart.number}`} entry="home" primary className="mt-3 md:mt-0 md:w-72 md:shrink-0">
            처음부터 다시 하기
          </BlockLink>
        )}
      </section>
    );
  return (
    <section aria-label="다음 장면" className="border-2 border-fg bg-card-raised p-3 text-ink md:flex md:items-center md:gap-5 md:p-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SceneThumb stage={next.stage} className="aspect-[4/3] w-[72px] shrink-0 border border-line" />
        <div className="min-w-0">
          <p className="truncate text-body font-bold leading-snug">{next.title}</p>
          <p className="mt-0.5 truncate text-meta text-ink-subtle">{sceneLine(next.relation, next.place)}</p>
        </div>
      </div>
      <BlockLink href={`/scenes/${next.number}`} entry="home" primary className="mt-3 md:mt-0 md:w-72 md:shrink-0">
        {answerCta(next.relation)}
      </BlockLink>
    </section>
  );
}

function Rows({ scenes, cleared, fresh, hideFrom }: { scenes: ShelfScene[]; cleared: string[]; fresh: string[]; hideFrom?: number }) {
  return (
    <ul className={SCENE_ROWS_CLASS}>
      {scenes.map((s, i) => (
        <li key={s.id} className={`${SCENE_ROW_ITEM_CLASS} ${hideFrom !== undefined && i >= hideFrom ? "max-lg:hidden" : ""}`}>
          <SceneRow scene={s} done={cleared.includes(s.id)} fresh={fresh.includes(s.id)} />
        </li>
      ))}
    </ul>
  );
}

// small은 "지난 특집" 안의 한 단계 아래 제목(h3)이다
function SectionTitle({ title, total, done, small = false }: { title: string; total: number; done: number; small?: boolean }) {
  const Tag = small ? "h3" : "h2";
  return (
    <Tag className="flex flex-wrap items-baseline gap-x-2">
      <span className={small ? "font-poster text-display-sm" : "font-poster text-display md:text-display-lg"}>{title}</span>
      <span className="text-note text-fg-subtle">{progressNote(total, done)}</span>
    </Tag>
  );
}

// 기간 중 특집 섹션. 제목 옆에 표지를 두고 장면을 모두 둔다(특집은 10개 안팎이라 접지 않는다).
// 표지는 썸네일 비율(4:3) 그대로 쓴다. 가로 띠로 자르면 그림이 확대돼 얼굴만 남았다
function LaneSection({ lane, cleared, fresh }: { lane: Lane; cleared: string[]; fresh: string[] }) {
  return (
    <section className="mt-10">
      <div className="flex items-end gap-3 md:gap-4">
        <span className="relative w-[96px] shrink-0 md:w-[144px]">
          <SceneThumb stage={lane.cover} className="aspect-[4/3] w-full border-2 border-fg" />
          <CoverSnow decor={lane.feature.decor} />
        </span>
        <div className="min-w-0 pb-0.5">
          <SectionTitle title={lane.feature.name} total={lane.scenes.length} done={lane.done} />
        </div>
      </div>
      <Rows scenes={lane.scenes} cleared={cleared} fresh={fresh} />
    </section>
  );
}

// 상황별 섹션. 4줄(데스크톱 6줄)을 보이되 안 해 본 장면을 추천 순서대로 앞에 두고, 남는 줄은 해 본 장면(체크)으로 채운다.
// 안 해 본 것만 보이면 거의 다 해 본 묶음이 "장면 1개뿐"처럼 보였다. 줄 수보다 많을 때만 "모두 보기"로 펼친다
const PREVIEW = 4;
const PREVIEW_WIDE = 6;
function GroupSection({ group, cleared, fresh, forceOpen }: { group: Group; cleared: string[]; fresh: string[]; forceOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const todo = group.scenes.filter((s) => !cleared.includes(s.id));
  const expanded = open || forceOpen;
  const preview = [...todo, ...group.scenes.filter((s) => cleared.includes(s.id))];
  const moreMobile = group.scenes.length > PREVIEW;
  const moreWide = group.scenes.length > PREVIEW_WIDE;
  return (
    <section className="mt-10">
      <SectionTitle title={group.label} total={group.scenes.length} done={group.scenes.length - todo.length} />
      <Rows scenes={expanded ? group.scenes : preview.slice(0, PREVIEW_WIDE)} cleared={cleared} fresh={fresh} hideFrom={expanded ? undefined : PREVIEW} />
      {!expanded && (moreMobile || moreWide) && (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className={`mt-2 flex min-h-11 items-center gap-1.5 font-label text-ui text-fg-muted hover:text-fg ${moreMobile ? "" : "max-lg:hidden"} ${moreWide ? "" : "lg:hidden"}`}
        >
          모두 보기
          <span className="rotate-90">
            <Arrow />
          </span>
        </button>
      )}
    </section>
  );
}

// 전체 장면. 다음 장면 한 줄 → 칩 → 기간 중 시즌 특집 → 상황별 → 상시 팩 → 지난 특집
export function AllScenes({ scenes }: { scenes: ShelfScene[] }) {
  const { cleared, fresh } = useVisitor(scenes);
  const { live, past, packs, groups } = useLanes(scenes, cleared);
  // 홈의 타일에서 들어오면 주소의 group(상황 이름이나 특집 slug)으로 그 모음만 먼저 보여 준다. 칩을 누르면 그 뒤로는 고른 쪽을 따른다
  const linked = useSyncExternalStore(noSubscribe, () => new URLSearchParams(location.search).get("group"), () => null);
  const [picked, setOnly] = useState<string | null | undefined>(undefined);
  const only = picked === undefined ? linked : picked;
  const order = laneOrder(scenes);
  const next = upNext(order, cleared, cleared.at(-1));
  const done = countDone(scenes, cleared);
  const chips = [...live.map((l) => ({ key: l.key, label: l.feature.name })), ...groups.map((g) => ({ key: g.label, label: g.label })), ...packs.map((l) => ({ key: l.key, label: l.feature.name }))];
  const shown = (key: string) => only === null || only === key;
  const pastShown = past.filter((l) => shown(l.key));
  return (
    <>
      <p className="-mt-3 mb-5 text-note text-fg-subtle md:-mt-6 md:mb-6">
        {scenes.length}장면{done > 0 && ` · ${done}개 해 봄`}
      </p>
      <NextRow next={next} restart={order.find((s) => !isFeatureSlug(s.category))} />
      {/* 모음이 많아 한 줄을 넘으면 옆으로 밀어서 본다. 고르면 그 모음만 남긴다 */}
      <div role="group" aria-label="상황과 특집" className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {[{ key: null, label: "전체" }, ...chips].map((c) => (
          <button
            key={c.key ?? "all"}
            type="button"
            onClick={() => setOnly(c.key)}
            aria-pressed={only === c.key}
            className={`min-h-9 shrink-0 whitespace-nowrap border-2 px-3 font-label text-ui ${only === c.key ? "border-fg bg-fg text-page" : "border-fg-subtle/40 text-fg-muted"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {live.filter((l) => shown(l.key)).map((l) => (
        <LaneSection key={l.key} lane={l} cleared={cleared} fresh={fresh} />
      ))}
      {groups.filter((g) => shown(g.label)).map((g) => (
        <GroupSection key={g.label} group={g} cleared={cleared} fresh={fresh} forceOpen={only === g.label} />
      ))}
      {packs.filter((l) => shown(l.key)).map((l) => (
        <LaneSection key={l.key} lane={l} cleared={cleared} fresh={fresh} />
      ))}
      {pastShown.length > 0 && (
        <section className="mt-14 border-t-2 border-fg pt-8">
          <h2 className="font-poster text-display md:text-display-lg">지난 특집</h2>
          {pastShown.map((l) => (
            <div key={l.key} className="mt-6">
              <SectionTitle title={l.feature.name} total={l.scenes.length} done={l.done} small />
              <Rows scenes={l.scenes} cleared={cleared} fresh={fresh} />
            </div>
          ))}
        </section>
      )}
      <ThumbStudio />
    </>
  );
}
