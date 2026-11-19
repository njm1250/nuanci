"use client";

import type { SceneCategory } from "@/features/scene/types";
import { DevPackBanner } from "./dev-pack-banner";

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
import { BOARD_WIDTH, ParkBoard, stoneCenter } from "./park-board";
import { RewardIcon } from "@/features/rewards/reward-icon";
import { StampSlot, STAMP_TILTS, weekLabels } from "@/features/streak/streak-section";
import { Flame } from "@/features/streak/streak-ui";
import { useKstDay } from "@/features/streak/kst-day";
import { sceneLine } from "@/features/scene/where";
import { MapPin } from "@/features/site/map-pin";
import { ReviewToday } from "@/features/review/review-today";
import { useReviewedToday } from "@/features/review/reviewed";
import { useStreak } from "@/features/streak/streak";
import { useIntroMode } from "./returning-sync";
import { answerCta } from "@/features/scene/teaser";
import { isUnopened, useRewards } from "@/features/rewards/rewards";
import type { StageSpec } from "@/features/stage/types";
import { FEATURES } from "@/features/site/lean";
import { VoiceCard } from "@/features/progression/voice-card";
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
  category?: SceneCategory;
  partnerLine?: string;
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
    <span className="shrink-0 bg-ink px-1 py-0.5 font-label-strong text-meta leading-none text-white">
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
  // 개발자 팩은 /dev로 따로 들어오는 묶음이라, 일반 홈의 다음 장면으로는 고르지 않는다
  const next = nextUncleared(scenes.filter((s) => s.category !== "dev"), cleared);
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
    ? "한 장면에 1~2분"
    : next
      ? `다음은 ${sceneLine(next.relation, next.place)}`
      : "모든 장면을 다 해 봤어요";
  return (
    <>
      <BlockLink href={`/scenes/${target.number}`} entry="home" primary>
        {label}
      </BlockLink>
      {/* 장면 대신 가볍게 시작하고 싶은 사람을 위한 두 번째 입구. 주요 버튼과 같은 너비의 흰 버튼으로 한 단계 낮춘다 */}
      {/* 모바일은 이 칸이 화면 아래에 붙어 있어서, 두 번째 버튼까지 두면 화면을 너무 많이 가린다. 모바일에서는 설명 아래 글자 링크로 둔다 */}
      {FEATURES.typetest && (
        <BlockLink href="/test" className="mt-2.5 hidden min-[960px]:block" pair>
          유형 테스트 먼저 해 보기
        </BlockLink>
      )}
      <p className="mt-3 text-center text-note text-fg-subtle">{note}</p>
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
      <span className={`blk flex h-full items-center bg-card-raised text-ink ${inRow ? "gap-2 p-1.5 pr-2" : "gap-3 p-2 pr-3"}`}>
        {inRow && <span className="w-7 shrink-0 text-right font-poster text-say-lg leading-none tabular-nums">{tocNumber(label)}</span>}
        <span className="relative shrink-0">
          <SceneThumb
            stage={scene.stage}
            className={`aspect-[4/3] border-2 border-line ${inRow ? "w-[72px]" : "w-[84px]"}`}
          />
          {done && (
            <span
              aria-label="해 본 장면"
              className="absolute right-1 top-1 grid size-5 place-items-center border border-ink bg-good"
            >
              <Check />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          {/* 화수와 NEW를 한 줄에 둔다. NEW가 오른쪽 끝 큰 블록이면 제목보다 무거워 눈이 먼저 간다(대표 카드의 "4화 NEW"와 같은 짝) */}
          {!inRow && (
            <span className="mb-1 flex items-center gap-1.5 text-meta font-medium leading-none text-ink-subtle">
              {label}
              {fresh && !next && <NewChip />}
            </span>
          )}
          <span className="block truncate text-body font-bold leading-snug">
            {scene.title}
          </span>
          <span className="mt-0.5 block truncate text-meta text-ink-subtle">
            {sceneLine(scene.relation, scene.place)}
          </span>
        </span>
        {next ? (
          <span className={`shrink-0 border-2 border-ink py-0.5 font-label text-ui leading-none ${inRow ? "px-1" : "px-1.5"}`}>
            다음
          </span>
        ) : (
          fresh && inRow && <NewChip />
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
      className="group -mx-2 flex items-center gap-3 px-2 py-2.5 transition-colors duration-fast hover:bg-fg hover:text-page"
    >
      {/* 목차처럼 화수를 굵은 숫자로 왼쪽에 세운다 */}
      <span className="w-8 shrink-0 text-right font-poster text-say-lg leading-none tabular-nums">{tocNumber(label)}</span>
      <span className="shrink-0">
        <SceneThumb
          stage={scene.stage}
          className="aspect-[4/3] w-[72px] border border-line"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-bold leading-snug">
          {scene.title}
        </span>
        <span className="mt-0.5 block truncate text-meta text-fg-subtle group-hover:text-page/70">
          {sceneLine(scene.relation, scene.place)}
        </span>
      </span>
      {done && (
        <span
          aria-label="해 본 장면"
          className="grid size-6 shrink-0 place-items-center border-2 border-ink bg-good text-ink"
        >
          <Check />
        </span>
      )}
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
      <span className="w-8 shrink-0 text-right font-poster text-say-lg leading-none tabular-nums text-fg-subtle">{tocNumber(label)}</span>
      <span className="grid aspect-[4/3] w-[72px] shrink-0 place-items-center border border-dashed border-line font-label text-ui text-fg-subtle">
        잠김
      </span>
      <span className="min-w-0 flex-1 text-fg-subtle">
        <span className="block truncate text-body leading-snug">
          {scene.title}
        </span>
        <span className="mt-0.5 block truncate text-meta">
          {sceneLine(scene.relation, scene.place)}
        </span>
      </span>
    </div>
  );
}

const SCENE_ROWS_CLASS =
  "stagger mt-3 grid grid-cols-1 border-t-2 border-fg md:grid-cols-2 md:gap-x-8 lg:grid-cols-3";
const SCENE_ROW_ITEM_CLASS = "list-row-lazy border-b border-line/40";

type Progress = ReturnType<typeof blockProgress<ShelfScene>>;

// 다음 10화까지를 보드게임 말판처럼 보여 준다. 장면 하나가 한 칸이고, Mochi가 말이 되어 다음 칸 위에 서 있다.
// 다음 10화까지를 공원 디딤돌로 보여 준다. 장면 하나가 돌 하나이고, Mochi가 마지막으로 끝낸 돌 위에 서 있으며
// 다음 보상 물건은 그 보상을 받는 장면의 돌 위에 놓인다. 화면에 들어오면 Mochi가 한 번 뛴다(동작 줄이기면 바로 끝 상태)
function BlockBar({ progress }: { progress: Progress }) {
  const rewards = useRewards();
  const filled = progress.left === 0 ? BLOCK_SIZE : progress.into;
  const next = rewards?.next;
  // 보상 물건은 그 보상을 받게 되는 장면의 돌 위에 둔다. 그림이 없는 물건이나 깜짝 상자는 상자 그림으로
  const rewardAt = next ? filled - 1 + next.remaining : null;
  const rewardId = next ? (next.type === "item" && next.id ? next.id : "box") : null;
  return (
    <div className="relative mt-3">
      <UnlockBubble progress={progress} walked={filled} />
      <div role="progressbar" aria-valuenow={filled} aria-valuemax={BLOCK_SIZE} aria-label="다음 10화까지">
        <ParkBoard walked={filled} rewardAt={rewardAt} rewardId={rewardId} hopDelay={200} />
      </div>
    </div>
  );
}

// 새 10화가 열린 순간, 말판 위 Mochi가 말풍선으로 한 번 알려 준다. 누르면 전체 장면으로 간다.
// 처음 본 순간 본 것으로 적어 두므로 다음 방문부터는 뜨지 않는다. 닫기 버튼 없이 한 번 지나가는 소식으로 둔다
function UnlockBubble({ progress, walked }: { progress: Progress; walked: number }) {
  const seen = useSeenOpenEnd();
  const [from] = useState(seen);
  const fresh = progress.openEnd > from;
  useEffect(() => {
    if (fresh) markOpenSeen(progress.openEnd);
  }, [fresh, progress.openEnd]);
  if (!fresh) return null;
  // 말풍선은 Mochi 머리 위에 둔다. Mochi가 오른쪽 절반에 있으면 말풍선이 왼쪽으로 펼쳐진다
  const x = (stoneCenter(Math.max(walked - 1, 0)) / BOARD_WIDTH) * 100;
  const right = x > 50;
  return (
    <Link
      href="/scenes"
      className="blk-frame-sm absolute -top-3 z-20 animate-pop"
      style={right ? { right: `calc(${100 - x}% + 10px)` } : { left: `calc(${x}% + 10px)` }}
    >
      <span className="blk flex items-center gap-1.5 whitespace-nowrap bg-white px-2.5 py-1.5 text-note font-bold leading-none text-ink-fixed">
        {from + 1}~{progress.openEnd}화가 열렸어!
        <Arrow />
      </span>
    </Link>
  );
}

// 칸 옆 숫자. 제목이 "다음 10화까지"라서 숫자는 채운 칸만 적는다
function BlockCount({ progress }: { progress: Progress }) {
  if (progress.left === 0) return null;
  return (
    <p className="flex shrink-0 items-baseline gap-0.5 text-note tabular-nums text-fg-subtle">
      <span className="font-poster text-say leading-none text-fg">{progress.into}</span>/{BLOCK_SIZE}
    </p>
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
    // 카드는 단단히 고정하고, 누르는 손맛은 분홍 키 하나가 맡는다. 카드 어디에 손을 올려도 키가 떠오르고 Mochi가 카드 위로 고개를 내민다
    <EntryLink href={`/scenes/${scene.number}`} entry="home" className="feat-card group mt-2 block lg:mt-0">
      <span aria-hidden className="feat-peek">
        <Mascot scale={2} />
      </span>
      <span className="relative block bg-card-raised p-3 text-ink md:grid md:grid-cols-2 md:gap-7 md:p-4">
        <span className="relative block">
          <SceneThumb
            stage={scene.stage}
            className="feat-thumb aspect-[2/1] w-full border-2 border-line md:aspect-[16/9] [&_img]:object-[center_60%]"
          />
          <span className="absolute left-2 top-2 bg-ink px-1.5 py-1 font-label text-ui leading-none text-fg">
            {label}
            {fresh && <span className="ml-1.5 text-pink">NEW</span>}
          </span>
          {/* 상대가 고르기 직전에 하는 말을 그림 위에 띄운다. 무슨 말에 답하게 될지가 버튼보다 먼저 보여 궁금증이 생긴다 */}
          {scene.partnerLine && (
            <span className="absolute right-2 top-2 max-w-[62%] border-2 border-ink bg-white px-2 py-1.5 text-ink-fixed md:right-3 md:top-3">
              <span className="block text-meta leading-none text-ink-subtle">{scene.relation}</span>
              <span className="mt-1 line-clamp-2 block font-line text-ui font-semibold leading-snug">{scene.partnerLine}</span>
            </span>
          )}
        </span>
        {/* 데스크톱 오른쪽 칸: 위에는 읽을 것(제목·장소), 아래에는 누를 것(키). 둘 사이는 선 대신 여백으로 나눈다 */}
        <span className="block md:flex md:flex-col md:justify-between md:py-0.5">
          <span className="block">
            <span className="mt-3.5 block font-poster text-display-sm leading-[1.2] md:mt-0 md:text-display md:leading-[1.15]">
              {scene.title}
            </span>
            {/* 누구와는 그림 위 말풍선이 말해 주므로 여기는 장소와 때만. 지도 핀이 장소라는 걸 알려 줘서 "동네 공원 · 오후"가 명사 더미로 읽히지 않는다 */}
            <span className="mt-1.5 flex items-center gap-1.5 text-note leading-[1.4] text-ink-subtle md:mt-3">
              <MapPin />
              {scene.place}
            </span>
          </span>
          {/* 키의 2px 먹선이 그림 테두리와 같은 세로선에 오게 왼쪽을 2px 들이고, 오른쪽은 먹선 2px + 그림자 3px 자리를 비운다 */}
          {/* 바깥 칸은 먹선·그림자, 안쪽 칸이 분홍 면. 한 칸에 두면 먹선 층이 분홍 면을 덮는다 */}
          <span className="feat-key ml-0.5 mr-[5px] mt-5 block md:mt-4">
            <span className="flex items-center justify-between bg-pink px-4 py-3.5 font-poster text-say text-ink">
              {/* 포스터 글꼴은 줄 상자 안에서 위로 치우쳐 그려져서, 줄 높이를 글자 크기에 맞추고 화살표를 3px 올려야 눈으로 본 가운데가 맞는다 */}
              <span className="leading-none">{answerCta(scene.relation)}</span>
              <svg width="21" height="21" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden className="feat-arrow relative -top-[3px] shrink-0 fill-current">
                <path d="M0 3h4v2H0zM4 1h1v6H4zM5 2h1v4H5zM6 3h1v2H6z" />
              </svg>
            </span>
          </span>
        </span>
      </span>
    </EntryLink>
  );
}

// 아지트로 가는 줄. 안 연 상자가 있으면 그게 먼저다(지금 할 수 있는 일). 없으면 다음 보상 물건을 이름과 남은 장면 수로 나눠 적는다.
// "장면 10개 더 하면 꽃 핀"처럼 한 문장에 이으면 물건 이름이 "꽃이 핀다"로 읽힐 수 있어서, 이름은 따로 굵게 둔다
function NextGoal() {
  const rewards = useRewards();
  const next = rewards?.next;
  const box = rewards?.items.some(isUnopened) ?? false;
  if (!rewards || (!next && !box)) return null;
  // 아지트에서 아직 안 본 물건이 있으면 점으로 알린다
  const unseen = rewards.items.some((i) => i.owned && !i.owned.seen);
  const prize = next ? (next.type === "box" ? "깜짝 상자" : next.name) : "";
  return (
    // 보상 그림은 위 디딤돌 위에 이미 있어서 이 줄은 글자와 아지트 버튼만 둔다. 핑크는 홈의 주 버튼 하나에만 쓰므로 아지트는 먹선 버튼
    <Link href="/me/room" className="group mt-3.5 flex items-center gap-3">
      {box && (
        <span className="shrink-0">
          <RewardIcon id="box" size={32} />
        </span>
      )}
      <span className="min-w-0 flex-1 leading-[1.35]">
        {box ? (
          <>
            <span className="block text-meta text-fg-subtle">아지트에</span>
            <span className="block truncate text-ui font-bold text-fg">안 연 상자</span>
          </>
        ) : (
          <>
            <span className="block text-meta text-fg-subtle">다음 보상</span>
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-ui font-bold text-fg">{prize}</span>
              {next && <span className="shrink-0 text-meta text-fg-subtle">장면 {next.remaining}개 남음</span>}
            </span>
          </>
        )}
      </span>
      <span className="flex min-h-11 shrink-0 items-center gap-1.5 border-2 border-ink bg-card px-3 font-label text-ui text-ink group-hover:bg-surface">
        {unseen && !box && <span aria-label="새 물건" className="size-2 bg-pink" />}
        {box ? "열기" : "아지트"}
        <Arrow />
      </span>
    </Link>
  );
}

// 오늘의 목표 자리. 체크박스 대신 내 정보와 같은 도장판(최근 7일)을 작게 둔다. 장면 하나를 끝내면 오늘 칸에 도장이 찍힌다
function TodayGoals() {
  const streak = useStreak();
  const labels = weekLabels(useKstDay());
  const week = streak?.week ?? Array<boolean>(7).fill(false);
  const current = streak?.current ?? 0;
  const today = Boolean(streak?.today);
  // 복습 입구를 다시 열면 도장판 아래에 오늘의 복습 한 줄이 붙는다. 오늘 물을 말이 없는 날은 뺀다
  const reviewed = useReviewedToday();
  const review = FEATURES.review && reviewed !== "none" ? reviewed === "done" : null;
  return (
    <div className="lg:border-2 lg:border-ink lg:bg-card-raised lg:p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-body font-bold">
          <Flame lit={today} size={18} />
          {current > 0 ? `${current}일 연속` : "오늘의 도장"}
        </h2>
        <span className="text-meta text-fg-subtle lg:text-ink-subtle">{today ? `내일도 하면 ${current + 1}일` : "장면 하나 끝내면 도장"}</span>
      </div>
      <ol className="mt-2.5 grid grid-cols-7 gap-1" aria-label="최근 7일 도장">
        {week.map((done, i) => (
          <li key={i} className="flex flex-col items-center gap-1" aria-label={`${labels[i]}요일${i === 6 ? " 오늘" : ""}, ${done ? "도장 찍음" : "안 함"}`}>
            <span className={`text-meta leading-none ${i === 6 ? "font-semibold text-fg lg:text-ink" : "text-fg-subtle lg:text-ink-subtle"}`}>{labels[i]}</span>
            <StampSlot done={done} today={i === 6} tilt={STAMP_TILTS[i]} />
          </li>
        ))}
      </ol>
      {review !== null && (
        <p className="mt-2.5 flex items-center gap-2.5 text-ui">
          <span aria-hidden className={`grid size-5 shrink-0 place-items-center border-2 ${review ? "border-ink bg-good" : "border-line"}`}>
            {review && <Check />}
          </span>
          <span className={review ? "text-fg-subtle line-through decoration-2 lg:text-ink-subtle" : ""}>오늘의 복습 끝내기</span>
        </p>
      )}
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
              <span className="mt-0.5 block text-meta leading-[1.35] text-fg-subtle">
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
    // 데스크톱은 왼쪽 넓은 칸에 할 장면을, 오른쪽 좁은 칸에 진행도·복습·바로 가기를 둔다.
    // 모바일은 할 장면을 먼저 두고 진행도와 목표는 그 아래로 내린다. 다시 온 사람이 하러 온 일이 상태 칸 뒤로 밀리지 않게 한다
    <section className="flex animate-fade flex-col px-4 pb-2 pt-7 md:px-0 md:pb-6 md:pt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-10">
      <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-1">
        {/* 모바일에서는 제목이 장면 카드 바로 위에 온다. 데스크톱은 오른쪽 진행도 칸의 제목이 같은 말을 한다 */}
        <h2 className="mb-2 text-body font-bold lg:hidden">{upNext.length > 0 ? "이어서 할 장면" : "모든 장면을 다 해 봤어요"}</h2>
        {upNext.length > 0 ? (
          <>
            <FeaturedScene
              scene={upNext[0]}
              fresh={fresh.includes(upNext[0].id)}
              label={label(upNext[0])}
            />
            {upNext.length > 1 && (
              <>
                <p className="mt-8 text-body font-bold">
                  다른 장면
                </p>
                <ul className="stagger mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
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
            <p className="mt-3 text-note leading-relaxed text-fg">
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
        {FEATURES.review && !reviewAfter && <ReviewToday className="order-1 mb-7 lg:mb-0" />}
        <div className="order-4 mt-8 lg:mt-0 lg:border-2 lg:border-ink lg:bg-card-raised lg:p-4">
        <div className="flex items-baseline justify-between">
            <h2 className="text-body font-bold">
              {progress.left === 0 ? "모든 화가 열렸어요" : `다음 ${BLOCK_SIZE}화까지`}
            </h2>
            <BlockCount progress={progress} />
          </div>
          <BlockBar progress={progress} />
          {FEATURES.rewards && <NextGoal />}
        </div>
        <div className="order-4 mt-8 lg:mt-0">
          {/* 오늘의 목표는 연속 기록과 복습으로 이뤄져서, 둘을 닫아 둔 동안에는 "내 영어 말투" 카드가 그 자리를 맡는다 */}
          {FEATURES.streak ? <TodayGoals /> : <VoiceCard compact />}
        </div>
        {FEATURES.review && reviewAfter && <ReviewToday className="order-3 mt-8 lg:mt-0" />}
        <div className="order-5">
        <div className="blk-frame blk-strong mt-6 lg:mt-0">
            <ul className="blk divide-y-2 divide-ink/10 bg-card-raised text-ink">
              <li>
                <Link
                  href="/expressions"
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink/5"
                >
                  <span>
                    <span className="block text-body font-semibold">표현 모음</span>
                    <span className="mt-0.5 block text-meta text-ink-subtle">
                      모은 표현 {done * PAIRS_PER_SCENE}개
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
                      {progress.openEnd}화까지 열림
                    </span>
                  </span>
                  <Arrow />
                </Link>
              </li>
            </ul>
          </div>
        </div>
        {/* 개발자 팩 캠페인. 오른쪽 칸(모바일은 바로 가기 아래) 맨 아래에 작게 둔다. 팩으로 사람을 데려오는 주 경로는 개발자 채널의 /dev 링크다 */}
        <DevPackBanner className="blk-strong order-6 mt-5 lg:mt-0" />
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
      className="flex border-2 border-fg-subtle/40"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={view === o.value}
          onClick={() => setSceneView(o.value)}
          className={`min-h-11 px-4 font-label text-ui ${view === o.value ? "bg-fg text-page" : "text-fg-muted"}`}
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

function Lock() {
  return (
    <svg width="12" height="14" viewBox="0 0 6 7" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-current">
      <path d="M1 0h4v1h1v2h-1v-2h-4v2h-1v-2h1zM0 3h6v4h-6z" />
    </svg>
  );
}

// 전체 장면 맨 위: 다음에 할 장면과 거기까지 걸어온 디딤돌. 165개 목록에서 다음 장면을 찾으러 내려가지 않게 한다.
// 다 해 봤으면 디딤돌만 남긴다
function NextUp({ next, label, progress }: { next: ShelfScene | null | undefined; label: string; progress: Progress }) {
  const nextStart = progress.openEnd + 1;
  return (
    <section
      aria-label="다음 장면"
      className={next ? "grid grid-cols-1 border-2 border-fg md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]" : "border-2 border-fg"}
    >
      {next && (
        <div className="bg-card-raised p-4 text-ink md:flex md:flex-col md:justify-between md:p-5">
          <div>
            <p className="text-meta text-ink-subtle">다음 장면 · {label}</p>
            <p className="mt-1.5 font-poster text-display-sm leading-[1.2]">{next.title}</p>
            <p className="mt-1.5 text-note text-ink-subtle">{sceneLine(next.relation, next.place)}</p>
          </div>
          <BlockLink href={`/scenes/${next.number}`} entry="home" primary className="mt-4 md:max-w-80">
            {label} 열기
          </BlockLink>
        </div>
      )}
      <div className={`bg-surface px-4 pb-3 ${next ? "border-t-2 border-fg md:flex md:flex-col md:justify-end md:border-l-2 md:border-t-0 md:px-5 md:pb-4" : ""}`}>
        <BlockBar progress={progress} />
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="text-note text-fg-subtle">
            {progress.left > 0 ? `${progress.left}개 더 하면 ${nextStart}~${nextStart + BLOCK_SIZE - 1}화가 열려요` : "모든 장면이 열려 있어요"}
          </p>
          <BlockCount progress={progress} />
        </div>
      </div>
    </section>
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
    opened.flatMap((x) => x.scenes).filter((s) => s.category !== "dev"),
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
      <NextUp next={next} label={next ? labelOf(next) : ""} progress={progress} />
      <div className="mt-8 flex items-center justify-between gap-3">
        <ViewSwitch view={view} />
        {/* 가까운 목표(10화)는 위 디딤돌이 맡고, 여기는 전체에서 얼마나 왔는지만 */}
        <p className="flex shrink-0 items-baseline gap-1 text-note tabular-nums text-fg-subtle">
          <span className="font-poster text-say leading-none text-fg">{scenes.filter((s) => cleared.includes(s.id)).length}</span>/ {scenes.length}
        </p>
      </div>
      {view === "order" ? (
        <>
          {opened.map((x) => (
            <section key={x.start} className="mt-10">
              <h2 className="flex items-baseline gap-2">
                <span className="font-poster text-display md:text-display-lg">
                  {blockTitle(x)}
                </span>
                <span className="text-note text-fg-subtle">
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
          {/* 잠긴 묶음은 길어서 한 줄로 접는다. 어떤 장면이 기다리는지는 펼쳐서 본다 */}
          {locked.length > 0 && (
            <details className="group/locked mt-10 border-2 border-fg">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 font-label text-ui text-fg [&::-webkit-details-marker]:hidden">
                <Lock />
                {locked[0].start}~{locked.at(-1)!.end}화
                <span className="text-note text-fg-subtle">잠김</span>
                <span aria-hidden className="ml-auto rotate-90 transition-transform duration-fast group-open/locked:-rotate-90">
                  <Arrow />
                </span>
              </summary>
              <div className="px-3 pb-4">
            {locked.map((x, k) => (
              <section key={x.start} className="mt-6">
                <h2 className="flex items-baseline gap-2">
                  <span className="font-poster text-display-sm text-fg-subtle">
                    {blockTitle(x)}
                  </span>
                  <span className="text-note text-fg-subtle">
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
              </div>
            </details>
          )}
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
                className={`min-h-9 shrink-0 whitespace-nowrap border-2 px-3 font-label text-ui ${only === label ? "border-fg bg-fg text-page" : "border-fg-subtle/40 text-fg-muted"}`}
              >
                {label ?? "전체"}
              </button>
            ))}
          </div>
          {shown.map((g) => (
            <section key={g.label} className="mt-10">
              <h2 className="flex items-baseline gap-2">
                <span className="font-poster text-display md:text-display-lg">{g.label}</span>
                <span className="text-note text-fg-subtle">
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
