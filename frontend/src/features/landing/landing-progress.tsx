"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BlockLink, EntryLink } from "@/features/scene/block-ui";
import {
  newSceneIds,
  nextUncleared,
  rememberSince,
  useCleared,
  useSince,
} from "@/features/scene/progress";
import { hasPlayed, trackHome, visitorId, watchEngagement } from "@/features/scene/track";
import { Mascot } from "@/features/mascot/mascot";
import { ReviewToday } from "@/features/review/review-today";
import { useReviewedToday } from "@/features/review/reviewed";
import { useStreak } from "@/features/streak/streak";
import { useIntroMode } from "./returning-sync";
import { answerCta } from "@/features/scene/teaser";
import {
  isUnopened,
  nextGoalParts,
  useRewards,
} from "@/features/rewards/rewards";
import type { StageSpec } from "@/features/stage/types";
import { SceneThumb, ThumbStudio } from "./scene-thumb";
import {
  groupOf,
  OTHER_GROUP,
  SCENE_GROUPS,
  setSceneView,
  useSceneView,
} from "./scene-groups";
import {
  BLOCK_SIZE,
  blockProgress,
  blockTitle,
  markOpenSeen,
  useSeenOpenEnd,
} from "@/features/scene/episodes";

// stage는 기본 상황의 무대로, 카드 썸네일을 그릴 때 쓴다
export type ShelfScene = {
  id: string;
  number: number;
  title: string;
  relation: string;
  place: string;
  stage?: StageSpec;
  category?: "meme";
};

const noop = () => () => {};

// 장면 하나를 끝내면 기본 상황과 만약에에서 표현이 하나씩 모인다
const PAIRS_PER_SCENE = 2;

function useVisitor(scenes: ShelfScene[] = []) {
  const played = useSyncExternalStore(noop, hasPlayed, () => false);
  const cleared = useCleared();
  const since = useSince();
  // 푸터의 "nuanci 소개"(/?intro)로 오면 다시 온 사람도 첫 방문 화면을 본다. 주소가 바뀔 때마다 ReturningSync가 맞춘다
  const intro = useIntroMode();
  const returning = !intro && (played || cleared.length > 0);
  useEffect(() => rememberSince(scenes), [scenes]);
  return { returning, cleared, fresh: newSceneIds(scenes, cleared, since) };
}

function NewChip() {
  return (
    <span className="shrink-0 bg-ink px-1.5 py-1 font-pixel-title text-meta leading-none text-[#ffffff]">
      NEW
    </span>
  );
}

function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      aria-hidden
      className="fill-ink"
    >
      <path d="M6 1h1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h1v1h1v1h1v-1h1v-1h1z" />
    </svg>
  );
}

// 첫 방문이면 첫 장면으로, 다시 오면 아직 안 해 본 다음 장면으로 보내는 시작 버튼
export function LandingCta({ scenes }: { scenes: ShelfScene[] }) {
  const { returning, cleared } = useVisitor(scenes);
  const next = nextUncleared(scenes, cleared);
  useEffect(() => {
    trackHome();
    return watchEngagement();
  }, []);
  const target = next ?? scenes[0];
  if (!target || returning) return null;
  const label = !returning
    ? answerCta(target.relation)
    : next
      ? "다음 장면 해 보기"
      : "처음부터 다시 하기";
  const note = !returning
    ? "가입 없이 바로 · 한 장면에 1분"
    : next
      ? `다음 · ${next.relation} · ${next.place}`
      : "모든 장면을 다 해 봤어요";
  return (
    <>
      <BlockLink href={`/scenes/${target.number}`} entry="home" primary>
        {label}
      </BlockLink>
      {/* 장면 대신 가볍게 시작하고 싶은 사람을 위한 두 번째 입구. 주요 버튼과 같은 너비의 흰 버튼으로 한 단계 낮춘다 */}
      {/* 모바일은 이 칸이 화면 아래에 붙어 있어서, 두 번째 버튼까지 두면 화면을 너무 많이 가린다. 모바일에서는 설명 아래 글자 링크로 둔다 */}
      <BlockLink href="/test" className="mt-2.5 hidden min-[960px]:block" pair>
        유형 테스트 먼저 해 보기
      </BlockLink>
      <p className="mt-3 text-center text-note text-paper-subtle">{note}</p>
    </>
  );
}

// 장면 카드. 무대 썸네일과 "3화" 같은 이름으로 어떤 장면인지 보여주고, 정답 표현은 장면 안에서만 알 수 있다. 이어서 할 장면에 '다음'을 단다
function SceneCard({
  scene,
  done,
  fresh = false,
  label,
  next = false,
  inRow = false,
}: {
  scene: ShelfScene;
  done: boolean;
  fresh?: boolean;
  label: string;
  next?: boolean;
  // 전체 장면 목록 안에 들어갈 때는 옆 줄과 높이를 맞추려고 썸네일과 여백을 줄과 같게 줄인다
  inRow?: boolean;
}) {
  return (
    <EntryLink
      href={`/scenes/${scene.number}`}
      entry="home"
      className="blk-btn block h-full"
    >
      <span className={`blk flex h-full items-center bg-cream text-ink ${inRow ? "gap-2 p-1.5 pr-2" : "gap-3 p-2 pr-3"}`}>
        {inRow && <span className="w-7 shrink-0 text-right font-poster text-say-lg leading-none tabular-nums">{tocNumber(label)}</span>}
        <span className="relative shrink-0">
          <SceneThumb
            stage={scene.stage}
            className={`aspect-[4/3] border-2 border-line ${inRow ? "w-[72px]" : "w-[84px]"}`}
          />
          {done && (
            <span
              aria-label="해 본 장면"
              className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center border-2 border-ink bg-good"
            >
              <Check />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          {!inRow && (
            <span className="mb-1 block text-meta font-medium leading-none text-ink-subtle">
              {label}
            </span>
          )}
          <span className="block truncate text-body font-bold leading-snug">
            {scene.title}
          </span>
          <span className="mt-0.5 block truncate text-meta text-ink-subtle">
            {scene.relation} · {scene.place}
          </span>
        </span>
        {next ? (
          <span className={`shrink-0 border-2 border-ink py-0.5 font-pixel text-ui leading-none ${inRow ? "px-1" : "px-1.5"}`}>
            다음
          </span>
        ) : (
          fresh && <NewChip />
        )}
      </span>
    </EntryLink>
  );
}

// "7화"는 목차 숫자 "07"로 바꾼다. 화수가 아닌 이름표는 그대로 쓴다
function tocNumber(label: string) {
  const m = /^(\d+)화$/.exec(label);
  return m ? m[1].padStart(2, "0") : label;
}

// 전체 장면 목록의 한 줄. 썸네일은 남기고 카드 틀을 덜어서, 블록은 다음에 할 장면에만 쓴다
function SceneRow({
  scene,
  done,
  fresh = false,
  label,
}: {
  scene: ShelfScene;
  done: boolean;
  fresh?: boolean;
  label: string;
}) {
  return (
    <EntryLink
      href={`/scenes/${scene.number}`}
      entry="home"
      className="group -mx-2 flex items-center gap-3 px-2 py-2.5 transition-colors duration-fast hover:bg-paper hover:text-night"
    >
      {/* 목차처럼 화수를 굵은 숫자로 왼쪽에 세운다 */}
      <span className="w-8 shrink-0 text-right font-poster text-say-lg leading-none tabular-nums">{tocNumber(label)}</span>
      <span className="relative shrink-0">
        <SceneThumb
          stage={scene.stage}
          className="aspect-[4/3] w-[72px] border border-line"
        />
        {done && (
          <span
            aria-label="해 본 장면"
            className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center border-2 border-ink bg-good"
          >
            <Check />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-bold leading-snug">
          {scene.title}
        </span>
        <span className="mt-0.5 block truncate text-meta text-paper-subtle group-hover:text-night/70">
          {scene.relation} · {scene.place}
        </span>
      </span>
      {fresh && <NewChip />}
      <span aria-hidden className="shrink-0 -translate-x-1 opacity-0 transition duration-fast group-hover:translate-x-0 group-hover:opacity-100">
        <Arrow />
      </span>
    </EntryLink>
  );
}

// 아직 열리지 않은 장면. 제목은 보여 줘서 궁금하게 하되 누를 수는 없다
function LockedSceneRow({
  scene,
  label,
}: {
  scene: ShelfScene;
  label: string;
}) {
  return (
    <div aria-disabled="true" className="flex items-center gap-3 py-2.5">
      <span className="w-8 shrink-0 text-right font-poster text-say-lg leading-none tabular-nums text-paper-subtle">{tocNumber(label)}</span>
      <span className="grid aspect-[4/3] w-[72px] shrink-0 place-items-center border border-dashed border-line font-pixel text-ui text-paper-subtle">
        잠김
      </span>
      <span className="min-w-0 flex-1 text-paper-subtle">
        <span className="block truncate text-body leading-snug">
          {scene.title}
        </span>
        <span className="mt-0.5 block truncate text-meta">
          {scene.relation} · {scene.place}
        </span>
      </span>
    </div>
  );
}

const SCENE_ROWS_CLASS =
  "stagger mt-3 grid grid-cols-1 border-t-2 border-paper md:grid-cols-2 md:gap-x-8 lg:grid-cols-3";
const SCENE_ROW_ITEM_CLASS = "list-row-lazy border-b border-line/40";

type Progress = ReturnType<typeof blockProgress<ShelfScene>>;

// 다음 10화가 열리기까지 채운 만큼을 한 줄로 보여 준다. 전체 장면 수 대신 가까운 목표를 보여 준다
function BlockBar({ progress }: { progress: Progress }) {
  const filled = progress.left === 0 ? BLOCK_SIZE : progress.into;
  return (
    <div
      className="mt-2 h-3 border-2 border-paper"
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemax={BLOCK_SIZE}
      aria-label="다음 10화까지"
    >
      <div
        className="h-full origin-left animate-fill bg-gold"
        style={{ width: `${(filled / BLOCK_SIZE) * 100}%` }}
      />
    </div>
  );
}

// 진행도 문구는 작은 쪽을 보여 준다. 10개 중 절반 전에는 한 개수를, 절반이 넘으면 남은 개수를 보여 줘야 빨리 나아가는 느낌이 든다
function BlockCount({ progress }: { progress: Progress }) {
  return (
    <p className="shrink-0 text-note text-paper-subtle">
      {progress.left === 0 ? (
        "모든 화가 열렸어요"
      ) : progress.into < BLOCK_SIZE / 2 ? (
        <>
          다음 {BLOCK_SIZE}화 열기{" "}
          <span className="font-bold text-paper">{progress.into}</span>/
          {BLOCK_SIZE}
        </>
      ) : (
        <>
          다음 {BLOCK_SIZE}화까지{" "}
          <span className="font-bold text-paper">{progress.left}개</span>
        </>
      )}
    </p>
  );
}

// 장면 10개를 채워 새 10화가 열린 순간을 홈에서 한 번 알려 준다. 누르면 전체 장면으로 가고, 누르거나 닫으면 다시 뜨지 않는다
function Unlocked({ progress }: { progress: Progress }) {
  const seen = useSeenOpenEnd();
  if (progress.openEnd <= seen) return null;
  return (
    <div className="mt-3 flex items-center gap-2 border border-line bg-card px-3 py-2 text-ink">
      <Link
        href="/scenes"
        onClick={() => markOpenSeen(progress.openEnd)}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 font-pixel text-ui"
      >
        <span>
          {seen + 1}~{progress.openEnd}화가 열렸어요
        </span>
        <Arrow />
      </Link>
      <button
        type="button"
        onClick={() => markOpenSeen(progress.openEnd)}
        aria-label="닫기"
        className="grid size-8 shrink-0 place-items-center font-pixel text-ui"
      >
        ✕
      </button>
    </div>
  );
}

function Arrow() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 5 5"
      shapeRendering="crispEdges"
      aria-hidden
      className="fill-current"
    >
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}

// 다시 온 방문자의 다음 장면. 시작 버튼을 카드 안에 넣어서 무엇이 시작되는지 한눈에 보이게 한다.
// 데스크톱은 그림과 글을 나란히 둬서 버튼과 아래 목록이 첫 화면에 들어오게 한다
function FeaturedScene({
  scene,
  fresh,
  label,
}: {
  scene: ShelfScene;
  fresh: boolean;
  label: string;
}) {
  return (
    <EntryLink
      href={`/scenes/${scene.number}`}
      entry="home"
      className="group blk-btn blk-strong mt-4 block"
    >
      <span className="blk block bg-cream p-2 pb-4 text-ink md:grid md:grid-cols-2 md:gap-8 md:p-3">
        <span className="relative block">
          <SceneThumb
            stage={scene.stage}
            className="aspect-[2/1] w-full border-2 border-line md:aspect-[16/9] [&_img]:object-[center_60%]"
          />
          <span className="absolute left-2 top-2 bg-ink px-1.5 py-1 font-pixel text-ui leading-none text-paper">
            {label}
            {fresh && <span className="ml-1.5 text-gold">NEW</span>}
          </span>
        </span>
        {/* 데스크톱은 제목을 위에, 버튼을 아래에 붙여 오른쪽 칸이 그림 높이를 꽉 채우게 한다. 가운데에 떠 있으면 위아래가 비어 보인다 */}
        <span className="block md:flex md:flex-col md:justify-between md:py-2">
          <span className="block">
            <span className="mt-3 block px-2 font-poster text-say-lg leading-[1.25] md:mt-0 md:text-display md:leading-[1.15]">
              {scene.title}
            </span>
            <span className="mt-1.5 block px-2 text-meta text-ink-subtle md:hidden">
              {scene.relation} · {scene.place}
            </span>
            {/* 데스크톱은 넓은 칸에 맞게 누구와·어디서를 표처럼 나눠 적는다 */}
            <span className="mx-2 mt-5 hidden grid-cols-[auto_minmax(0,1fr)] border-t border-line/60 md:grid">
              <span className="border-b border-line/60 py-2.5 pr-4 text-meta text-ink-subtle">누구와</span>
              <span className="truncate border-b border-line/60 py-2.5 text-ui font-semibold">{scene.relation}</span>
              <span className="border-b border-line/60 py-2.5 pr-4 text-meta text-ink-subtle">어디서</span>
              <span className="truncate border-b border-line/60 py-2.5 text-ui font-semibold">{scene.place}</span>
            </span>
          </span>
          <span className="mx-2 mt-4 flex items-center justify-between border-2 border-ink bg-gold px-4 py-3 font-poster text-say text-ink transition-transform duration-fast group-hover:translate-x-0.5 md:mt-0 md:py-3.5">
            {/* 포스터 글꼴은 글자가 줄 상자 안에서 위로 치우쳐 그려져서, 줄 높이를 글자 크기에 맞추고 화살표를 3px 올려야 눈으로 본 가운데가 맞는다 */}
            <span className="leading-none">{answerCta(scene.relation)}</span>
            {/* 주요 버튼 화살표는 몸통이 있는 도트 화살표로 크게 그려야 움직이는 게 보인다 */}
            <svg width="21" height="21" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden className="nudge relative -top-[3px] shrink-0 fill-current">
              <path d="M0 3h4v2H0zM4 1h1v6H4zM5 2h1v4H5zM6 3h1v2H6z" />
            </svg>
          </span>
        </span>
      </span>
    </EntryLink>
  );
}

// 다음 꾸미기 아이템까지 남은 장면 수. 진행도를 다음에 할 이유로 이어 주고 아지트로 보낸다
function NextGoal() {
  const rewards = useRewards();
  const next = rewards?.next;
  if (!next) return null;
  const [before, em, after] = nextGoalParts(next);
  // 아지트에서 아직 안 본 물건이 있으면 점으로 알린다
  const unseen = rewards.items.some((i) => i.owned && !i.owned.seen);
  const box = rewards.items.some(isUnopened);
  return (
    <Link
      href="/me/room"
      className="mt-3 flex items-center gap-3 bg-night-deep px-3 py-2 hover:bg-slate-block"
    >
      <Mascot scale={2} className="shrink-0" />
      <span className="min-w-0 flex-1 text-note text-paper-muted">
        {before}
        <span className="mx-0.5 font-bold text-paper">{em}</span>
        {after}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-pixel text-ui text-paper-subtle">
        {box ? (
          <span className="hl font-pixel-title text-meta leading-[1.4]">
            새 상자
          </span>
        ) : (
          unseen && <span aria-label="새 물건" className="size-2 bg-gold" />
        )}
        아지트
        <Arrow />
      </span>
    </Link>
  );
}

// 오늘 할 일 두 가지를 체크 목록으로 보여 준다. 연속 기록과 복습이 같은 하루 단위로 이어진다
function TodayGoals() {
  const streak = useStreak();
  const reviewed = useReviewedToday();
  // 오늘 물을 말이 없는 날은 복습을 목표에서 빼고 흐리게만 남긴다. 한 게 없는데 체크가 되어 있으면 거짓말이 된다
  const goals = [
    { label: "장면 하나 끝내기", done: Boolean(streak?.today), off: false },
    { label: reviewed === "none" ? "오늘은 복습할 말 없음" : "오늘의 복습 끝내기", done: reviewed === "done", off: reviewed === "none" },
  ];
  const counted = goals.filter((g) => !g.off);
  const done = counted.filter((g) => g.done).length;
  return (
    <div className="lg:border lg:border-line lg:bg-cream lg:p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-body font-bold">오늘의 목표</h2>
        <span className="text-meta tabular-nums text-paper-subtle lg:text-ink-subtle">
          {done}/{counted.length}
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {goals.map((g) => (
          <li key={g.label} className={`flex items-center gap-2.5 text-ui ${g.off ? "text-paper-subtle lg:text-ink-subtle" : ""}`}>
            <span aria-hidden className={`grid size-5 shrink-0 place-items-center border-2 ${g.done ? "border-ink bg-good" : g.off ? "border-dashed border-line" : "border-line"}`}>
              {g.done && <Check />}
            </span>
            <span className={g.done ? "text-paper-subtle line-through decoration-2 lg:text-ink-subtle" : ""}>{g.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const openCount = (list: ShelfScene[], open: Set<string>) => list.filter((s) => open.has(s.id)).length;

// 상황 타일마다 따로 꾸민 무대. 묶음의 첫 장면을 쓰면 거실·소파가 겹쳐 다 같아 보여서, 그 상황을 한눈에 알 만한 세트·상대·소품을 골라 둔다
const GROUP_STAGES: Record<string, Omit<StageSpec, "hero" | "wear">> = {
  "병맛 대회": { set: "freezer", time: "day", partner: "mc", flags: ["blizzard"], decor: [{ id: "contest-poster", x: 1.9 }] },
  친구랑: { set: "karaoke", time: "evening", partner: "sam", flags: ["score", "mirrorball", "lights"] },
  "같이 사는 사이": { set: "living", time: "evening", partner: "mom", decor: [{ id: "bill-pile", x: -1.9 }, { id: "slippers", x: 1.2 }] },
  회사에서: { set: "office", time: "day", partner: "boss", decor: [{ id: "whiteboard", x: -1.6 }, { id: "papers", x: 1.5 }] },
  "카페·식당에서": { set: "cafe", time: "day", partner: "barista", flags: ["coffee", "cup-ready"] },
  가게에서: { set: "boutique", time: "day", partner: "alex", decor: [{ id: "sale-sign", x: 1.9 }] },
  "여행·이동 중": { set: "plane", time: "day", partner: "jordan" },
  "병원·약국에서": { set: "pharmacy", time: "day", partner: "max" },
  "학교·학원에서": { set: "classroom", time: "day", partner: "kong" },
  "처음 보는 사람": { set: "street", time: "evening", partner: "grandpa", decor: [{ id: "umbrella-stand", x: -1.8 }] },
};

// 상황별로 장면을 고르는 입구. 묶음마다 첫 장면 썸네일을 붙여 글자 대신 실제 무대로 어떤 상황인지 보여 준다
function SituationTiles({ scenes, open }: { scenes: ShelfScene[]; open: Set<string> }) {
  const tiles = SCENE_GROUPS.map((g) => ({ label: g.label, scenes: scenes.filter((s) => groupOf(s.relation, s.stage?.set, s.category) === g.label) }))
    // 지금 열린 장면이 하나도 없는 상황은 눌러도 잠김뿐이라 빼고, 고를 상황이 둘도 안 되면 칸 자체를 숨긴다
    .filter((g) => openCount(g.scenes, open) > 0)
    .slice(0, 8);
  if (tiles.length < 2) return null;
  return (
    <>
      <p className="mt-8 text-body font-bold">상황별로 고르기</p>
      <ul className="-mx-4 mt-2 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {tiles.map((t) => (
          <li key={t.label} className="w-[148px] shrink-0 snap-start lg:w-auto">
            <Link href={`/scenes?group=${encodeURIComponent(t.label)}`} onClick={() => setSceneView("group")} className="group block">
              <SceneThumb stage={GROUP_STAGES[t.label] ?? t.scenes[0].stage} className="aspect-[4/3] w-full border-2 border-line transition-colors group-hover:border-ink" />
              <span className="mt-2 block truncate text-ui font-bold leading-[1.35]">{t.label}</span>
              {/* 눌러서 대부분 잠겨 있으면 실망하니, 지금 할 수 있는 개수를 같이 적는다 */}
              <span className="mt-0.5 block text-meta leading-[1.35] text-paper-subtle">
                {openCount(t.scenes, open) === t.scenes.length ? `장면 ${t.scenes.length}개` : `${t.scenes.length}개 중 ${openCount(t.scenes, open)}개 열림`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

// 홈 순서 실험 묶음. 방문자 id 첫 글자(16진수)가 홀수면 복습을 장면 아래에 둔다. 같은 사람은 늘 같은 묶음이다
const noSubscribe = () => () => {};
function useReviewAfter() {
  return useSyncExternalStore(noSubscribe, () => parseInt(visitorId()[0], 16) % 2 === 1, () => false);
}

// 다시 온 방문자에게 진행도와 다음에 볼 장면 몇 개만 보여준다. 장면이 늘어도 메인이 길어지지 않게 전체 목록은 따로 둔다
export function SceneShelf({
  scenes,
  limit = 5,
}: {
  scenes: ShelfScene[];
  limit?: number;
}) {
  const { returning, cleared, fresh } = useVisitor(scenes);
  const reviewAfter = useReviewAfter();
  if (!returning) return null;
  const done = scenes.filter((s) => cleared.includes(s.id)).length;
  const progress = blockProgress(scenes, cleared);
  const open = new Set(
    progress.list
      .filter((x) => x.open)
      .flatMap((x) => x.scenes.map((s) => s.id)),
  );
  const label = (s: ShelfScene) => `${scenes.indexOf(s) + 1}화`;
  // 다음에 볼 장면은 열린 화 안에서만 고른다
  const upNext = scenes
    .filter((s) => open.has(s.id) && !cleared.includes(s.id))
    .slice(0, limit);
  return (
    // 데스크톱은 왼쪽 넓은 칸에 할 장면을, 오른쪽 좁은 칸에 진행도·복습·바로 가기를 둔다. 모바일은 같은 조각을 예전 순서대로 쌓는다
    <section className="flex animate-fade flex-col px-4 pb-2 pt-2 md:px-0 md:pb-6 md:pt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-10">
      <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-1">
        {upNext.length > 0 ? (
          <>
            <FeaturedScene
              scene={upNext[0]}
              fresh={fresh.includes(upNext[0].id)}
              label={label(upNext[0])}
            />
            {upNext.length > 1 && (
              <>
                <p className="mt-6 text-body font-bold">
                  다른 장면
                </p>
                <ul className="stagger mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {/* 모바일은 두 개만, 넓은 왼쪽 칸이 생기는 데스크톱은 네 개까지 보여 준다 */}
                  {upNext.slice(1).map((s, i) => (
                    <li key={s.id} className={i >= 2 ? "max-lg:hidden" : undefined}>
                      <SceneCard
                        scene={s}
                        done={false}
                        fresh={fresh.includes(s.id)}
                        label={label(s)}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <>
            <p className="mt-3 text-note leading-relaxed text-paper">
              새 장면이 올라오면 여기서 바로 이어서 할 수 있어요.
            </p>
            <BlockLink
              href={`/scenes/${scenes[0]?.number ?? 1}`}
              entry="home"
              primary
              className="mt-4"
            >
              처음부터 다시 하기
            </BlockLink>
          </>
        )}
        <SituationTiles scenes={scenes} open={open} />
      </div>
      {/* 오른쪽 칸. 모바일에서는 틀 없이 풀려서 장면 앞뒤 자리에 끼어든다 */}
      <div className="contents lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-6">
        {/* 복습을 장면보다 먼저 보여 줄지 실험 중이다. 방문자 id로 반씩 나눠서, 서버에 이미 남는 방문자 id만으로 두 묶음의 장면 시작률·복습 참여율을 비교할 수 있다. 데스크톱은 오른쪽 칸의 위·아래로 나뉜다 */}
        {!reviewAfter && <ReviewToday className="order-1 mb-7 lg:mb-0" />}
        <div className="order-2 lg:border lg:border-line lg:bg-cream lg:p-4">
        <div className="flex items-baseline justify-between">
            <h2 className="text-body font-bold">
              {upNext.length > 0 ? "다음에 볼 장면" : "모든 장면을 다 해 봤어요"}
            </h2>
            <BlockCount progress={progress} />
          </div>
          <BlockBar progress={progress} />
          <Unlocked progress={progress} />
          <NextGoal />
        </div>
        <div className="order-2 mt-6 lg:mt-0">
          <TodayGoals />
        </div>
        {reviewAfter && <ReviewToday className="order-4 mt-8 lg:mt-0" />}
        <div className="order-5">
        <div className="blk-frame mt-5 lg:mt-0">
            <ul className="blk divide-y-2 divide-ink/10 bg-cream text-ink">
              <li>
                <Link
                  href="/expressions"
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink/5"
                >
                  <span>
                    <span className="block text-body font-semibold">표현 모음</span>
                    <span className="mt-0.5 block text-meta text-ink-subtle">
                      모은 표현 {done * PAIRS_PER_SCENE}개 · 복습하기
                    </span>
                  </span>
                  <Arrow />
                </Link>
              </li>
              <li>
                <Link
                  href="/scenes"
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink/5"
                >
                  <span>
                    <span className="block text-body font-semibold">전체 장면</span>
                    <span className="mt-0.5 block text-meta text-ink-subtle">
                      {progress.openEnd}화까지 열림 · 상황별로도 골라 보기
                    </span>
                  </span>
                  <Arrow />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <ThumbStudio />
    </section>
  );
}

// 순서대로(기본) 보기와 상황별 보기를 바꾸는 세그먼트 컨트롤. 둘 중 하나만 고르므로 라디오 그룹으로 알린다
function ViewSwitch({ view }: { view: "group" | "order" }) {
  const options = [
    { value: "order", label: "순서대로" },
    { value: "group", label: "상황별" },
  ] as const;
  return (
    <div
      role="radiogroup"
      aria-label="보기 방식"
      className="flex border-2 border-paper-subtle/40"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={view === o.value}
          onClick={() => setSceneView(o.value)}
          className={`min-h-11 px-4 font-pixel text-ui ${view === o.value ? "bg-paper text-night" : "text-paper-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// 상황별 목록. 아직 안 열린 장면도 자리를 지키되 잠김으로 보여 준다
function SceneList({
  scenes,
  cleared,
  fresh,
  lockedIn,
  labelOf,
}: {
  scenes: ShelfScene[];
  cleared: string[];
  fresh: string[];
  lockedIn: Set<string>;
  labelOf: (s: ShelfScene) => string;
}) {
  return (
    <ul className={SCENE_ROWS_CLASS}>
      {scenes.map((s) => (
        <li key={s.id} className={SCENE_ROW_ITEM_CLASS}>
          {lockedIn.has(s.id) ? (
            <LockedSceneRow scene={s} label={labelOf(s)} />
          ) : (
            <SceneRow
              scene={s}
              done={cleared.includes(s.id)}
              fresh={fresh.includes(s.id)}
              label={labelOf(s)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

// 전체 장면 목록. 순서대로 보면 10화씩 묶이고, 상황별로 보면 누구와 어디서 말하는지로 묶인다. 깬 장면에는 체크가 붙는다.
// 아직 안 열린 장면도 모두 보여 주되 잠김으로 표시해서, 어떤 장면이 기다리는지 보이게 한다. 상황별 보기에서도 같다.
// 어느 장면이든 10개를 할 때마다 다음 10화가 열린다
export function SceneGrid({ scenes }: { scenes: ShelfScene[] }) {
  const { cleared, fresh } = useVisitor(scenes);
  const view = useSceneView();
  // 홈의 상황별 칸에서 들어오면 주소의 group으로 그 상황만 먼저 보여 준다. 칩을 누르면 그 뒤로는 고른 쪽을 따른다
  const linkedGroup = useSyncExternalStore(noSubscribe, () => new URLSearchParams(location.search).get("group"), () => null);
  const [picked, setOnly] = useState<string | null | undefined>(undefined);
  const only = picked === undefined ? linkedGroup : picked;
  const progress = blockProgress(scenes, cleared);
  const opened = progress.list.filter((x) => x.open);
  const locked = progress.list.filter((x) => !x.open);
  const next = nextUncleared(
    opened.flatMap((x) => x.scenes),
    cleared,
  );
  // 순서를 바꾸다 이미 해 본 장면이 잠긴 묶음으로 밀려나도, 해 본 장면은 잠그지 않는다
  const lockedIn = new Set(
    locked.flatMap((x) =>
      x.scenes.filter((s) => !cleared.includes(s.id)).map((s) => s.id),
    ),
  );
  const labelOf = (s: ShelfScene) => `${scenes.indexOf(s) + 1}화`;
  const groups = [...SCENE_GROUPS.map((g) => g.label), OTHER_GROUP]
    .map((label) => ({
      label,
      scenes: scenes.filter((s) => groupOf(s.relation, s.stage?.set, s.category) === label),
    }))
    .filter((g) => g.scenes.length > 0);
  const shown = only ? groups.filter((g) => g.label === only) : groups;
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <ViewSwitch view={view} />
        <BlockCount progress={progress} />
      </div>
      <BlockBar progress={progress} />
      <p className="mt-2 text-note text-paper-subtle">
        장면 {BLOCK_SIZE}개를 할 때마다 다음 {BLOCK_SIZE}화가 열려요
      </p>
      {view === "order" ? (
        <>
          {opened.map((x) => (
            <section key={x.start} className="mt-10">
              <h2 className="flex items-baseline gap-2">
                <span className="font-poster text-display md:text-display-lg">
                  {blockTitle(x)}
                </span>
                <span className="text-note text-paper-subtle">
                  {x.scenes.length}화 중 {x.done}화
                </span>
              </h2>
              <ol className={SCENE_ROWS_CLASS}>
                {x.scenes.map((s, i) => (
                  <li key={s.id} className={s.id === next?.id ? `${SCENE_ROW_ITEM_CLASS} py-1` : SCENE_ROW_ITEM_CLASS}>
                    {s.id === next?.id ? (
                      <SceneCard
                        scene={s}
                        done={cleared.includes(s.id)}
                        fresh={fresh.includes(s.id)}
                        label={`${x.start + i}화`}
                        next
                        inRow
                      />
                    ) : (
                      <SceneRow
                        scene={s}
                        done={cleared.includes(s.id)}
                        fresh={fresh.includes(s.id)}
                        label={`${x.start + i}화`}
                      />
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {locked.map((x, k) => (
            <section key={x.start} className="mt-10">
              <h2 className="flex items-baseline gap-2">
                <span className="font-poster text-display text-paper-subtle md:text-display-lg">
                  {blockTitle(x)}
                </span>
                <span className="text-note text-paper-subtle">
                  장면 {progress.left + k * BLOCK_SIZE}개 더 하면 열려요
                </span>
              </h2>
              <ol className={SCENE_ROWS_CLASS}>
                {x.scenes.map((s, i) => (
                  <li key={s.id} className={SCENE_ROW_ITEM_CLASS}>
                    {lockedIn.has(s.id) ? (
                      <LockedSceneRow scene={s} label={`${x.start + i}화`} />
                    ) : (
                      <SceneRow
                        scene={s}
                        done
                        fresh={false}
                        label={`${x.start + i}화`}
                      />
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </>
      ) : (
        <>
          {/* 묶음이 많아 한 줄을 넘으면 옆으로 밀어서 본다. 고르면 그 묶음만 남긴다 */}
          <div
            role="group"
            aria-label="상황"
            className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
          >
            {[null, ...groups.map((g) => g.label)].map((label) => (
              <button
                key={label ?? "all"}
                type="button"
                onClick={() => setOnly(label)}
                aria-pressed={only === label}
                className={`min-h-9 shrink-0 whitespace-nowrap border-2 px-3 font-pixel text-ui ${only === label ? "border-paper bg-paper text-night" : "border-paper-subtle/40 text-paper-muted"}`}
              >
                {label ?? "전체"}
              </button>
            ))}
          </div>
          {shown.map((g) => (
            <section key={g.label} className="mt-10">
              <h2 className="flex items-baseline gap-2">
                <span className="font-poster text-display md:text-display-lg">{g.label}</span>
                <span className="text-note text-paper-subtle">
                  {g.scenes.length}개 중{" "}
                  {g.scenes.filter((s) => cleared.includes(s.id)).length}개
                </span>
              </h2>
              <SceneList
                scenes={g.scenes}
                cleared={cleared}
                fresh={fresh}
                lockedIn={lockedIn}
                labelOf={labelOf}
              />
            </section>
          ))}
        </>
      )}
      <ThumbStudio />
    </>
  );
}
