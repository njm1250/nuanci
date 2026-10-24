"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { BlockLink, EntryLink } from "@/features/scene/block-ui";
import { newSceneIds, nextUncleared, rememberSince, useCleared, useSince } from "@/features/scene/progress";
import { hasPlayed, trackHome } from "@/features/scene/track";
import { Mascot } from "@/features/mascot/mascot";
import { nextGoalText, nextReward } from "@/features/rewards/rewards";

export type ShelfScene = { id: string; number: number; title: string; relation: string; place: string };

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
  const label = !returning ? "바로 시작하기" : next ? "다음 장면 해 보기" : "처음부터 다시 하기";
  const note = !returning ? "가입 없이 · 1분이면 끝나요" : next ? `다음 · ${next.relation} · ${next.place}` : "모든 장면을 다 해 봤어요";
  return (
    <>
      <BlockLink href={`/scenes/${target.number}`} entry="home" gold>
        {label}
      </BlockLink>
      <p className="mt-3 text-center text-[13px] text-paper-subtle">{note}</p>
    </>
  );
}

// 장면 카드. 제목은 상황만 담아서 처음부터 보여주고, 정답 표현은 장면 안에서만 알 수 있다
function SceneCard({ scene, done, fresh = false }: { scene: ShelfScene; done: boolean; fresh?: boolean }) {
  return (
    <EntryLink href={`/scenes/${scene.number}`} entry="home" className="blk-btn block h-full">
      <span className="blk flex h-full items-center gap-3 bg-cream px-3 py-3 text-ink">
        {done && (
          <span aria-label="해 본 장면" className="grid size-6 shrink-0 place-items-center bg-gold">
            <Check />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold leading-snug">
            {scene.title}
          </span>
          <span className="block truncate text-[13px] text-ink-subtle">
            {scene.relation} · {scene.place}
          </span>
        </span>
        {fresh && <NewChip />}
      </span>
    </EntryLink>
  );
}

// 해 본 비율을 한 줄로 이어서 채운다
function Progress({ scenes, cleared }: { scenes: ShelfScene[]; cleared: string[] }) {
  const done = scenes.filter((s) => cleared.includes(s.id)).length;
  return (
    <div className="mt-2 h-2 bg-night-deep" role="progressbar" aria-valuenow={done} aria-valuemax={scenes.length} aria-label="해 본 장면">
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

// 다시 온 방문자의 다음 장면. 시작 버튼을 카드 안에 넣어서 무엇이 시작되는지 한눈에 보이게 한다
function FeaturedScene({ scene, fresh }: { scene: ShelfScene; fresh: boolean }) {
  return (
    <EntryLink href={`/scenes/${scene.number}`} entry="home" className="blk-btn blk-btn-gold mt-4 block">
      <span className="blk block bg-gold px-4 py-4 text-ink">
        {fresh && <span className="mb-2 inline-block bg-ink px-1.5 py-1 font-pixel-title text-[12px] leading-none text-paper">NEW</span>}
        <span className="block font-pixel-title text-[24px] leading-[1.25]">{scene.title}</span>
        <span className="mt-1 block text-[13px] text-ink-muted">
          {scene.relation} · {scene.place}
        </span>
        <span className="mt-3 flex items-center justify-between border-t-2 border-ink/15 pt-3 font-pixel text-[15px]">
          다음 장면 해 보기
          <Arrow />
        </span>
      </span>
    </EntryLink>
  );
}

// 다음 꾸미기 아이템까지 남은 장면 수. 진행도를 다음에 할 이유로 이어 주고 아지트로 보낸다
function NextGoal({ cleared }: { cleared: string[] }) {
  const next = nextReward(cleared);
  if (!next) return null;
  return (
    <Link href="/me/room" className="mt-3 flex items-center gap-3 bg-night-deep px-3 py-2 hover:bg-slate-block">
      <Mascot scale={2} className="shrink-0" />
      <span className="min-w-0 flex-1 text-[13px] text-paper-muted">{nextGoalText(next)}</span>
      <span className="flex shrink-0 items-center gap-1.5 font-pixel text-[15px] text-paper-subtle">
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
      <NextGoal cleared={cleared} />
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
          <BlockLink href={`/scenes/${scenes[0]?.number ?? 1}`} entry="home" gold className="mt-4">
            처음부터 다시 하기
          </BlockLink>
        </>
      )}
      <div className="mt-3 flex justify-between">
        <Link href="/expressions" className="-ml-2 flex min-h-11 items-center gap-2 px-2 font-pixel text-[15px] text-paper-muted hover:text-paper">
          표현 모음 ({done * PAIRS_PER_SCENE}개)
        </Link>
        <Link href="/scenes" className="-mr-2 flex min-h-11 items-center gap-2 px-2 font-pixel text-[15px] text-paper-muted hover:text-paper">
          전체 보기
          <Arrow />
        </Link>
      </div>
    </section>
  );
}

// 전체 장면 목록. 깬 장면에는 체크가 붙고, 잠금 없이 아무 장면이나 고를 수 있다
export function SceneGrid({ scenes }: { scenes: ShelfScene[] }) {
  const { cleared, fresh } = useVisitor(scenes);
  const done = scenes.filter((s) => cleared.includes(s.id)).length;
  return (
    <>
      <div className="flex items-baseline justify-between">
        <span />
        <p className="shrink-0 text-[13px] text-paper-subtle">
          {scenes.length}개 중 <span className="font-semibold text-gold">{done}개</span>
        </p>
      </div>
      <Progress scenes={scenes} cleared={cleared} />
      <ul className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {scenes.map((s) => (
          <li key={s.id}>
            <SceneCard scene={s} done={cleared.includes(s.id)} fresh={fresh.includes(s.id)} />
          </li>
        ))}
      </ul>
    </>
  );
}
