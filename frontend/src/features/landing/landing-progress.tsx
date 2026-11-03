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
import { hasPlayed, trackHome, watchEngagement } from "@/features/scene/track";
import { Mascot } from "@/features/mascot/mascot";
import { ReviewToday } from "@/features/review/review-today";
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
  const returning = played || cleared.length > 0;
  useEffect(() => rememberSince(scenes), [scenes]);
  return { returning, cleared, fresh: newSceneIds(scenes, cleared, since) };
}

function NewChip() {
  return (
    <span className="shrink-0 bg-gold px-1.5 py-1 font-pixel-title text-[12px] leading-none text-ink">
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
    ? `${target.title}부터 하기`
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
      <p className="mt-3 text-center text-[14px] text-paper-subtle">{note}</p>
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
      <span className={`blk flex h-full items-center gap-3 bg-cream pr-3 text-ink ${inRow ? "p-1.5" : "p-2"}`}>
        <span className="relative shrink-0">
          <SceneThumb
            stage={scene.stage}
            className={`aspect-[4/3] border-2 border-line ${inRow ? "w-[72px]" : "w-[84px]"}`}
          />
          {done && (
            <span
              aria-label="해 본 장면"
              className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center border-2 border-ink bg-gold"
            >
              <Check />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-pixel text-[15px] leading-none text-ink-subtle">
            {label}
          </span>
          <span className="mt-1 block truncate text-[16px] font-semibold leading-snug">
            {scene.title}
          </span>
          <span className="block truncate text-[14px] text-ink-subtle">
            {scene.relation} · {scene.place}
          </span>
        </span>
        {next ? (
          <span className="shrink-0 border-2 border-ink px-1.5 py-0.5 font-pixel text-[15px] leading-none">
            다음
          </span>
        ) : (
          fresh && <NewChip />
        )}
      </span>
    </EntryLink>
  );
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
      className="flex items-center gap-3 py-2.5"
    >
      <span className="relative shrink-0">
        <SceneThumb
          stage={scene.stage}
          className="aspect-[4/3] w-[72px] border border-line"
        />
        {done && (
          <span
            aria-label="해 본 장면"
            className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center border-2 border-ink bg-gold"
          >
            <Check />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-pixel text-[15px] leading-none text-paper-subtle">
          {label}
        </span>
        <span className="mt-1 block truncate text-[16px] font-semibold leading-snug">
          {scene.title}
        </span>
        <span className="block truncate text-[13px] text-paper-subtle">
          {scene.relation} · {scene.place}
        </span>
      </span>
      {fresh && <NewChip />}
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
      <span className="grid aspect-[4/3] w-[72px] shrink-0 place-items-center border border-dashed border-line font-pixel text-[15px] text-paper-subtle">
        잠김
      </span>
      <span className="min-w-0 flex-1 text-paper-subtle">
        <span className="block font-pixel text-[15px] leading-none">
          {label}
        </span>
        <span className="mt-1 block truncate text-[16px] leading-snug">
          {scene.title}
        </span>
        <span className="block truncate text-[13px]">
          {scene.relation} · {scene.place}
        </span>
      </span>
    </div>
  );
}

const SCENE_ROWS_CLASS =
  "mt-3 grid grid-cols-1 border-t-2 border-paper md:grid-cols-2 md:gap-x-8 lg:grid-cols-3";
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
        className="h-full bg-gold"
        style={{ width: `${(filled / BLOCK_SIZE) * 100}%` }}
      />
    </div>
  );
}

// 진행도 문구는 작은 쪽을 보여 준다. 10개 중 절반 전에는 한 개수를, 절반이 넘으면 남은 개수를 보여 줘야 빨리 나아가는 느낌이 든다
function BlockCount({ progress }: { progress: Progress }) {
  return (
    <p className="shrink-0 text-[14px] text-paper-subtle">
      {progress.left === 0 ? (
        "모든 화가 열렸어요"
      ) : progress.into < BLOCK_SIZE / 2 ? (
        <>
          다음 {BLOCK_SIZE}화 열기{" "}
          <span className="font-semibold text-gold">{progress.into}</span>/
          {BLOCK_SIZE}
        </>
      ) : (
        <>
          다음 {BLOCK_SIZE}화까지{" "}
          <span className="font-semibold text-gold">{progress.left}개</span>
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
        className="flex min-w-0 flex-1 items-center justify-between gap-2 font-pixel text-[15px]"
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
        className="grid size-8 shrink-0 place-items-center font-pixel text-[15px]"
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
      className="blk-btn blk-strong mt-4 block"
    >
      <span className="blk block bg-cream p-2 pb-4 text-ink md:grid md:grid-cols-2 md:gap-8 md:p-3">
        <span className="relative block">
          <SceneThumb
            stage={scene.stage}
            className="aspect-[2/1] w-full border-2 border-line md:aspect-[16/9] [&_img]:object-[center_60%]"
          />
          <span className="absolute left-2 top-2 bg-ink px-1.5 py-1 font-pixel text-[15px] leading-none text-paper">
            {label}
            {fresh && <span className="ml-1.5 text-gold">NEW</span>}
          </span>
        </span>
        <span className="block md:flex md:flex-col md:justify-center">
          <span className="mt-3 block px-2 font-poster text-[24px] leading-[1.25] md:mt-0">
            {scene.title}
          </span>
          <span className="mt-1.5 block px-2 text-[14px] text-ink-subtle">
            {scene.relation} · {scene.place}
          </span>
          <span className="mx-2 mt-4 flex items-center justify-between border border-ink bg-gold px-3 py-2.5 font-pixel text-[15px] text-ink">
            다음 장면 해 보기
            <Arrow />
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
      <span className="min-w-0 flex-1 text-[14px] text-paper-muted">
        {before}
        <span className="mx-0.5 font-bold text-paper">{em}</span>
        {after}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-pixel text-[15px] text-paper-subtle">
        {box ? (
          <span className="hl font-pixel-title text-[12px] leading-[1.4]">
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

// 다시 온 방문자에게 진행도와 다음에 볼 장면 몇 개만 보여준다. 장면이 늘어도 메인이 길어지지 않게 전체 목록은 따로 둔다
export function SceneShelf({
  scenes,
  limit = 3,
}: {
  scenes: ShelfScene[];
  limit?: number;
}) {
  const { returning, cleared, fresh } = useVisitor(scenes);
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
    <section className="animate-[fade-in_200ms] px-4 pb-2 pt-2 md:px-0 md:pb-6 md:pt-10">
      {/* 다시 온 이유가 되도록 지난번 헷갈린 말을 맨 위에서 먼저 묻는다 */}
      <ReviewToday />
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-bold">
          {upNext.length > 0 ? "다음에 볼 장면" : "모든 장면을 다 해 봤어요"}
        </h2>
        <BlockCount progress={progress} />
      </div>
      <BlockBar progress={progress} />
      <Unlocked progress={progress} />
      <NextGoal />
      {upNext.length > 0 ? (
        <>
          <FeaturedScene
            scene={upNext[0]}
            fresh={fresh.includes(upNext[0].id)}
            label={label(upNext[0])}
          />
          {upNext.length > 1 && (
            <>
              <p className="mt-6 text-[16px] font-bold">
                다른 장면
              </p>
              <ul className="mt-2 grid gap-3 md:grid-cols-2">
                {upNext.slice(1).map((s) => (
                  <li key={s.id}>
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
          <p className="mt-3 text-[14px] leading-relaxed text-paper">
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
      <ThumbStudio />
      {/* 눌러서 들어가는 곳은 글자만 두지 않고, 화살표가 붙은 줄로 만들어 누를 수 있다는 게 보이게 한다 */}
      <div className="blk-frame mt-5">
        <ul className="blk divide-y-2 divide-ink/10 bg-cream text-ink">
          <li>
            <Link
              href="/expressions"
              className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink/5"
            >
              <span>
                <span className="block font-pixel text-[15px]">표현 모음</span>
                <span className="block text-[14px] text-ink-subtle">
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
                <span className="block font-pixel text-[15px]">전체 장면</span>
                <span className="block text-[14px] text-ink-subtle">
                  {progress.openEnd}화까지 열림 · 상황별로도 골라 보기
                </span>
              </span>
              <Arrow />
            </Link>
          </li>
        </ul>
      </div>
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
          className={`min-h-10 px-4 font-pixel text-[15px] ${view === o.value ? "bg-paper text-night" : "text-paper-muted"}`}
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
  const [only, setOnly] = useState<string | null>(null);
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
      <p className="mt-2 text-[14px] text-paper-subtle">
        장면 {BLOCK_SIZE}개를 할 때마다 다음 {BLOCK_SIZE}화가 열려요
      </p>
      {view === "order" ? (
        <>
          {opened.map((x) => (
            <section key={x.start} className="mt-10">
              <h2 className="flex items-baseline gap-2">
                <span className="font-poster text-[32px] md:text-[44px]">
                  {blockTitle(x)}
                </span>
                <span className="text-[14px] text-paper-subtle">
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
                <span className="font-poster text-[32px] text-paper-subtle md:text-[44px]">
                  {blockTitle(x)}
                </span>
                <span className="text-[14px] text-paper-subtle">
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
                className={`min-h-9 shrink-0 whitespace-nowrap border-2 px-3 font-pixel text-[15px] ${only === label ? "border-paper bg-paper text-night" : "border-paper-subtle/40 text-paper-muted"}`}
              >
                {label ?? "전체"}
              </button>
            ))}
          </div>
          {shown.map((g) => (
            <section key={g.label} className="mt-10">
              <h2 className="flex items-baseline gap-2">
                <span className="font-poster text-[32px] md:text-[44px]">{g.label}</span>
                <span className="text-[14px] text-paper-subtle">
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
