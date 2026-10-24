import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminJson, getAdminScenes, type AdminScene } from "@/features/admin/api";
import { Panel } from "@/features/scene/block-ui";
import { TRAP_LABELS, type Trap } from "@/features/scene/types";

type SceneMix = { situations: number; traps: Record<Trap, number>; compositions: Record<string, number>; warnings: string[] };
import { StatusChip } from "@/features/admin/status-chip";

export const metadata: Metadata = { title: "장면 관리 · nuanci" };

function SceneRow({ s }: { s: AdminScene }) {
  return (
    <li>
      <Link href={`/admin/scenes/${s.id}`} className="blk-btn block">
        <span className="blk block bg-cream px-3 py-3 text-ink">
          <span className="flex items-center gap-2">
            <StatusChip status={s.status} />
            <span className="truncate text-[13px] text-ink-subtle">
              /scenes/{s.number} · {s.id} · v{s.version}
            </span>
          </span>
          <span className="mt-1.5 block text-[16px] font-semibold leading-snug">{s.title}</span>
          {s.warnings.length > 0 ? (
            <span className="mt-2 block space-y-0.5 text-[13px] leading-snug text-rust">
              {s.warnings.map((w) => (
                <span key={w} className="block">
                  · {w}
                </span>
              ))}
            </span>
          ) : (
            <span className="mt-2 block text-[13px] text-ink-subtle">선택지 구성 확인 완료</span>
          )}
        </span>
      </Link>
    </li>
  );
}

// 장면 전체에서 어떤 함정과 판정 구성을 얼마나 썼는지 보여줘서 새 장면을 쓸 때 덜 쓴 쪽을 고르게 한다
async function MixSummary() {
  const mix = await getAdminJson<SceneMix>("/api/admin/scenes/mix");
  if (!mix) return null;
  const traps = (Object.entries(mix.traps) as [Trap, number][]).sort((a, b) => b[1] - a[1]);
  return (
    <Panel className="mt-6">
      <div className="p-4">
        <p className="font-pixel text-[15px]">구성 한눈에 보기 <span className="text-ink-subtle">· 초안과 공개 장면, 상황 {mix.situations}개</span></p>
        <p className="mt-3 text-[13px] text-ink-subtle">함정 유형</p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[14px]">
          {traps.map(([trap, n]) => (
            <span key={trap} className={n === 0 ? "text-ink-subtle" : ""}>
              {TRAP_LABELS[trap]} <span className="font-semibold tabular-nums">{n}</span>
            </span>
          ))}
        </p>
        <p className="mt-3 text-[13px] text-ink-subtle">판정 구성</p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[14px]">
          {Object.entries(mix.compositions).map(([key, n]) => (
            <span key={key}>
              {key} <span className="font-semibold tabular-nums">{n}</span>
            </span>
          ))}
        </p>
        {mix.warnings.map((w) => (
          <p key={w} className="mt-2 text-[13px] text-rust">
            · {w}
          </p>
        ))}
      </div>
    </Panel>
  );
}

async function SceneList() {
  const scenes = await getAdminScenes();
  return (
    <ul className="mt-6 space-y-4">
      {scenes.map((s) => (
        <SceneRow key={s.id} s={s} />
      ))}
    </ul>
  );
}

export default function AdminScenesPage() {
  return (
    <>
      <h1 className="font-pixel-title text-[24px]">장면</h1>
      <p className="mt-1 text-[14px] leading-relaxed text-paper-muted">
        선택지마다 판정(O / △ / X)과 어색한 이유(함정)를 정해요. 초안은 미리보기에서만 보이고, 공개하면 바로 사이트에 나와요.
      </p>
      <Suspense fallback={<p className="mt-6 font-pixel text-[15px] text-paper-subtle">불러오는 중…</p>}>
        <MixSummary />
        <SceneList />
      </Suspense>
    </>
  );
}
