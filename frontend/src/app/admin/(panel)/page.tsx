import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminScenes, type AdminScene } from "@/features/admin/api";
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
        상황마다 선택지는 직역, 맥락 주의, 자연스러움을 하나씩 넣어요. 초안은 미리보기에서만 보이고, 공개하면 바로 사이트에 나와요.
      </p>
      <Suspense fallback={<p className="mt-6 font-pixel text-[15px] text-paper-subtle">불러오는 중…</p>}>
        <SceneList />
      </Suspense>
    </>
  );
}
