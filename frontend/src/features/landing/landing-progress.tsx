"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { BlockLink, EntryLink } from "@/features/scene/block-ui";
import { newSceneIds, nextUncleared, rememberSince, useCleared, useSince } from "@/features/scene/progress";
import { hasPlayed, trackHome } from "@/features/scene/track";

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

function NewCount({ n, className = "" }: { n: number; className?: string }) {
  if (n === 0) return null;
  return <span className={`inline-block bg-gold px-1.5 py-1 align-middle font-pixel-title text-[12px] leading-none text-ink ${className}`}>새 장면 {n}개</span>;
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
  if (!target) return null;
  const label = !returning ? "바로 시작하기" : next ? "이어서 하기" : "처음부터 다시 하기";
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

// 안 해 본 장면은 제목을 "???"로 가리고 관계·장소만 단서로 보여준다
function SceneCard({ scene, done, next = false, fresh = false }: { scene: ShelfScene; done: boolean; next?: boolean; fresh?: boolean }) {
  return (
    <EntryLink href={`/scenes/${scene.number}`} entry="home" className="blk-btn block h-full" style={next ? ({ "--edge": "var(--color-night-deep)" } as React.CSSProperties) : undefined}>
      <span className={`blk flex h-full items-center gap-3 px-3 py-3 ${next ? "bg-slate-block text-paper" : "bg-cream text-ink"}`}>
        {next ? (
          <span className="shrink-0 bg-paper px-1.5 py-1 font-pixel-title text-[12px] leading-none text-ink">다음</span>
        ) : (
          <span className={`grid size-6 shrink-0 place-items-center ${done ? "bg-gold" : "border-2 border-ink/30"}`}>{done && <Check />}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold leading-snug" aria-label={done ? undefined : "아직 안 해 본 장면"}>
            {done ? scene.title : "???"}
          </span>
          <span className={`block truncate text-[13px] ${next ? "text-paper-subtle" : "text-ink-subtle"}`}>
            {scene.relation} · {scene.place}
          </span>
        </span>
        {fresh && <NewChip />}
      </span>
    </EntryLink>
  );
}

function Progress({ scenes, cleared }: { scenes: ShelfScene[]; cleared: string[] }) {
  return (
    <div className="mt-2 flex gap-1" role="progressbar" aria-valuenow={scenes.filter((s) => cleared.includes(s.id)).length} aria-valuemax={scenes.length} aria-label="해 본 장면">
      {scenes.map((s) => (
        <span key={s.id} className={`h-2 flex-1 ${cleared.includes(s.id) ? "bg-gold" : "bg-night-deep"}`} />
      ))}
    </div>
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
        <h2 className="font-pixel text-[15px]">
          {upNext.length > 0 ? "다음에 볼 장면" : "모든 장면을 다 해 봤어요"}
          <NewCount n={fresh.length} className="ml-2" />
        </h2>
        <p className="font-pixel text-[15px] text-paper-subtle">
          <span className="text-gold">{done}</span> / {scenes.length}
        </p>
      </div>
      <Progress scenes={scenes} cleared={cleared} />
      {upNext.length === 0 && <p className="mt-3 text-[14px] leading-relaxed text-paper">새 장면이 올라오면 여기서 바로 이어서 할 수 있어요.</p>}
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {upNext.map((s, i) => (
          <li key={s.id}>
            <SceneCard scene={s} done={false} next={i === 0} fresh={fresh.includes(s.id)} />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between">
        <Link href="/expressions" className="-ml-2 flex min-h-11 items-center gap-2 px-2 font-pixel text-[15px] text-paper-muted hover:text-paper">
          표현 모음 ({done * PAIRS_PER_SCENE}개)
        </Link>
        <Link href="/scenes" className="-mr-2 flex min-h-11 items-center gap-2 px-2 font-pixel text-[15px] text-paper-muted hover:text-paper">
          전체 보기 ({scenes.length})
          <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="fill-current">
            <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
          </svg>
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
        <p className="text-[14px] text-paper-muted">아무거나 골라 보세요. 해 본 장면은 제목이 열려요.</p>
        <p className="font-pixel text-[15px] text-paper-subtle">
          <span className="text-gold">{done}</span> / {scenes.length}
        </p>
      </div>
      <Progress scenes={scenes} cleared={cleared} />
      {fresh.length > 0 && <NewCount n={fresh.length} className="mt-3" />}
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
