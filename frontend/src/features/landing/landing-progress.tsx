"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BlockLink, EntryLink } from "@/features/scene/block-ui";
import { newSceneIds, nextUncleared, rememberSince, useCleared, useSince } from "@/features/scene/progress";
import { hasPlayed, trackHome } from "@/features/scene/track";
import { Mascot } from "@/features/mascot/mascot";
import { DailyExpression } from "./daily-expression";
import { isUnopened, nextGoalParts, useRewards } from "@/features/rewards/rewards";
import type { StageSpec } from "@/features/stage/types";
import { episode, SceneThumb, ThumbStudio } from "./scene-thumb";
import { groupOf, OTHER_GROUP, SCENE_GROUPS, setSceneView, useSceneView } from "./scene-groups";

// stage는 기본 상황의 무대로, 카드 썸네일을 그릴 때 쓴다
export type ShelfScene = { id: string; number: number; title: string; relation: string; place: string; stage?: StageSpec };

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
  return <span className="shrink-0 bg-gold px-1.5 py-1 font-pixel-title text-[12px] leading-none text-ink">NEW</span>;
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden className="fill-ink">
      <path d="M6 1h1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h1v1h1v1h1v-1h1v-1h1z" />
    </svg>
  );
}

// 첫 방문이면 첫 장면으로, 다시 오면 아직 안 해 본 다음 장면으로 보내는 시작 버튼
export function LandingCta({ scenes }: { scenes: ShelfScene[] }) {
  const { returning, cleared } = useVisitor(scenes);
  const next = nextUncleared(scenes, cleared);
  useEffect(trackHome, []);
  const target = next ?? scenes[0];
  if (!target || returning) return null;
  const label = !returning ? "사고 치러 가기" : next ? "다음 장면 해 보기" : "처음부터 다시 하기";
  const note = !returning ? "가입 없이 바로 · 한 장면에 1분" : next ? `다음 · ${next.relation} · ${next.place}` : "모든 장면을 다 해 봤어요";
  return (
    <>
      <BlockLink href={`/scenes/${target.number}`} entry="home" primary>
        {label}
      </BlockLink>
      <p className="mt-3 text-center text-[13px] text-paper-subtle">{note}</p>
    </>
  );
}

// 장면 카드. 무대 썸네일과 회차 번호로 어떤 장면인지 보여주고, 정답 표현은 장면 안에서만 알 수 있다.
// 순서대로 볼 때는 회차 번호 자리에 몇 번째 장면인지를 쓰고, 이어서 할 장면에 '다음'을 단다
function SceneCard({ scene, done, fresh = false, label, next = false }: { scene: ShelfScene; done: boolean; fresh?: boolean; label?: string; next?: boolean }) {
  return (
    <EntryLink href={`/scenes/${scene.number}`} entry="home" className="blk-btn block h-full">
      <span className="blk flex h-full items-center gap-3 bg-cream p-2 pr-3 text-ink">
        <span className="relative shrink-0">
          <SceneThumb stage={scene.stage} className="aspect-[4/3] w-[84px] border-2 border-ink" />
          {done && (
            <span aria-label="해 본 장면" className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center border-2 border-ink bg-gold">
              <Check />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-pixel text-[15px] leading-none text-ink-subtle">{label ?? episode(scene.number)}</span>
          <span className="mt-1 block truncate text-[16px] font-semibold leading-snug">
            {scene.title}
          </span>
          <span className="block truncate text-[13px] text-ink-subtle">
            {scene.relation} · {scene.place}
          </span>
        </span>
        {next ? <span className="shrink-0 border-2 border-ink px-1.5 py-0.5 font-pixel text-[13px] leading-none">다음</span> : fresh && <NewChip />}
      </span>
    </EntryLink>
  );
}

// 해 본 비율을 한 줄로 이어서 채운다
function Progress({ scenes, cleared }: { scenes: ShelfScene[]; cleared: string[] }) {
  const done = scenes.filter((s) => cleared.includes(s.id)).length;
  return (
    <div className="mt-2 h-3 border-2 border-paper" role="progressbar" aria-valuenow={done} aria-valuemax={scenes.length} aria-label="해 본 장면">
      <div className="h-full bg-gold" style={{ width: `${scenes.length ? (done / scenes.length) * 100 : 0}%` }} />
    </div>
  );
}

function Arrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="fill-current">
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}

// 다시 온 방문자의 다음 장면. 시작 버튼을 카드 안에 넣어서 무엇이 시작되는지 한눈에 보이게 하고, 제목에만 형광펜을 긋는다
function FeaturedScene({ scene, fresh }: { scene: ShelfScene; fresh: boolean }) {
  return (
    <EntryLink href={`/scenes/${scene.number}`} entry="home" className="blk-btn mt-4 block">
      <span className="blk block bg-cream p-2 pb-4 text-ink">
        <span className="relative block">
          <SceneThumb stage={scene.stage} className="aspect-[2/1] w-full border-2 border-ink [&_img]:object-[center_60%]" />
          <span className="absolute left-2 top-2 bg-ink px-1.5 py-1 font-pixel text-[15px] leading-none text-paper">
            {episode(scene.number)}
            {fresh && <span className="ml-1.5 text-gold">NEW</span>}
          </span>
        </span>
        <span className="mt-3 block px-2 font-pixel-title text-[24px] leading-[1.25]">
          <span className="hl">{scene.title}</span>
        </span>
        <span className="mt-1 block px-2 text-[13px] text-ink-muted">
          {scene.relation} · {scene.place}
        </span>
        <span className="mx-2 mt-3 flex items-center justify-between bg-ink px-3 py-2.5 font-pixel text-[15px] text-paper">
          다음 장면 해 보기
          <Arrow />
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
    <Link href="/me/room" className="mt-3 flex items-center gap-3 bg-night-deep px-3 py-2 hover:bg-slate-block">
      <Mascot scale={2} className="shrink-0" />
      <span className="min-w-0 flex-1 text-[13px] text-paper-muted">
        {before}
        <span className="hl mx-0.5 font-semibold">{em}</span>
        {after}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-pixel text-[15px] text-paper-subtle">
        {box ? (
          <span className="hl font-pixel-title text-[12px] leading-[1.4]">새 상자</span>
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
export function SceneShelf({ scenes, limit = 3 }: { scenes: ShelfScene[]; limit?: number }) {
  const { returning, cleared, fresh } = useVisitor(scenes);
  if (!returning) return null;
  const done = scenes.filter((s) => cleared.includes(s.id)).length;
  const upNext = scenes.filter((s) => !cleared.includes(s.id)).slice(0, limit);
  return (
    <section className="animate-[fade-in_200ms] px-4 pb-2 pt-2 md:px-0 md:pb-6 md:pt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-pixel text-[15px]">{upNext.length > 0 ? "다음에 볼 장면" : "모든 장면을 다 해 봤어요"}</h2>
        <p className="text-[13px] text-paper-subtle">
          {scenes.length}개 중 <span className="font-semibold text-gold">{done}개</span> 해 봤어요
        </p>
      </div>
      <Progress scenes={scenes} cleared={cleared} />
      <NextGoal />
      {upNext.length > 0 ? (
        <>
          <FeaturedScene scene={upNext[0]} fresh={fresh.includes(upNext[0].id)} />
          {upNext.length > 1 && (
            <>
              <p className="mt-5 font-pixel text-[15px] text-paper-subtle">다른 장면</p>
              <ul className="mt-2 grid gap-3 md:grid-cols-2">
                {upNext.slice(1).map((s) => (
                  <li key={s.id}>
                    <SceneCard scene={s} done={false} fresh={fresh.includes(s.id)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <>
          <p className="mt-3 text-[14px] leading-relaxed text-paper">새 장면이 올라오면 여기서 바로 이어서 할 수 있어요.</p>
          <BlockLink href={`/scenes/${scenes[0]?.number ?? 1}`} entry="home" primary className="mt-4">
            처음부터 다시 하기
          </BlockLink>
        </>
      )}
      <DailyExpression scenes={scenes} />
      <ThumbStudio />
      {/* 눌러서 들어가는 곳은 글자만 두지 않고, 화살표가 붙은 줄로 만들어 누를 수 있다는 게 보이게 한다 */}
      <div className="blk-frame mt-5">
        <ul className="blk divide-y-2 divide-ink/10 bg-cream text-ink">
          <li>
            <Link href="/expressions" className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink/5">
              <span>
                <span className="block font-pixel text-[15px]">표현 모음</span>
                <span className="block text-[13px] text-ink-subtle">모은 표현 {done * PAIRS_PER_SCENE}개 · 복습하기</span>
              </span>
              <Arrow />
            </Link>
          </li>
          <li>
            <Link href="/scenes" className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink/5">
              <span>
                <span className="block font-pixel text-[15px]">전체 장면</span>
                <span className="block text-[13px] text-ink-subtle">{scenes.length}개 중에서 골라 보기</span>
              </span>
              <Arrow />
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}

// 상황별 보기와 순서대로 보기를 바꾸는 세그먼트 컨트롤. 둘 중 하나만 고르므로 라디오 그룹으로 알린다
function ViewSwitch({ view }: { view: "group" | "order" }) {
  const options = [
    { value: "group", label: "상황별" },
    { value: "order", label: "순서대로" },
  ] as const;
  return (
    <div role="radiogroup" aria-label="보기 방식" className="flex border-2 border-paper-subtle/40">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={view === o.value}
          onClick={() => setSceneView(o.value)}
          className={`min-h-10 px-4 font-pixel text-[15px] ${view === o.value ? "bg-gold text-ink" : "text-paper-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SceneList({ scenes, cleared, fresh }: { scenes: ShelfScene[]; cleared: string[]; fresh: string[] }) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {scenes.map((s) => (
        <li key={s.id}>
          <SceneCard scene={s} done={cleared.includes(s.id)} fresh={fresh.includes(s.id)} />
        </li>
      ))}
    </ul>
  );
}

// 전체 장면 목록. 상황별로 묶어 보거나, 장면이 나오는 순서 그대로 볼 수 있다. 깬 장면에는 체크가 붙고, 잠금 없이 아무 장면이나 고를 수 있다
export function SceneGrid({ scenes }: { scenes: ShelfScene[] }) {
  const { cleared, fresh } = useVisitor(scenes);
  const view = useSceneView();
  const [only, setOnly] = useState<string | null>(null);
  const done = scenes.filter((s) => cleared.includes(s.id)).length;
  const next = nextUncleared(scenes, cleared);
  const groups = [...SCENE_GROUPS.map((g) => g.label), OTHER_GROUP]
    .map((label) => ({ label, scenes: scenes.filter((s) => groupOf(s.relation, s.stage?.set) === label) }))
    .filter((g) => g.scenes.length > 0);
  const shown = only ? groups.filter((g) => g.label === only) : groups;
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <ViewSwitch view={view} />
        <p className="shrink-0 text-[13px] text-paper-subtle">
          {scenes.length}개 중 <span className="font-semibold text-gold">{done}개</span>
        </p>
      </div>
      <Progress scenes={scenes} cleared={cleared} />
      {view === "order" ? (
        <ol className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {scenes.map((s, i) => (
            <li key={s.id}>
              <SceneCard scene={s} done={cleared.includes(s.id)} fresh={fresh.includes(s.id)} label={`${i + 1}번째`} next={s.id === next?.id} />
            </li>
          ))}
        </ol>
      ) : (
        <>
          {/* 묶음이 많아 한 줄을 넘으면 옆으로 밀어서 본다. 고르면 그 묶음만 남긴다 */}
          <div role="group" aria-label="상황" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {[null, ...groups.map((g) => g.label)].map((label) => (
              <button
                key={label ?? "all"}
                type="button"
                onClick={() => setOnly(label)}
                aria-pressed={only === label}
                className={`min-h-9 shrink-0 whitespace-nowrap border-2 px-3 font-pixel text-[13px] ${only === label ? "border-gold bg-gold text-ink" : "border-paper-subtle/40 text-paper-muted"}`}
              >
                {label ?? "전체"}
              </button>
            ))}
          </div>
          {shown.map((g) => (
            <section key={g.label} className="mt-6">
              <h2 className="flex items-baseline gap-2">
                <span className="font-pixel-title text-[24px]">{g.label}</span>
                <span className="text-[13px] text-paper-subtle">
                  {g.scenes.length}개 중 {g.scenes.filter((s) => cleared.includes(s.id)).length}개
                </span>
              </h2>
              <SceneList scenes={g.scenes} cleared={cleared} fresh={fresh} />
            </section>
          ))}
        </>
      )}
      <ThumbStudio />
    </>
  );
}
