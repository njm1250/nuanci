import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { setSceneStatus } from "@/features/admin/actions";
import { getAdminScene, type AdminScene } from "@/features/admin/api";
import { SceneEditor } from "@/features/admin/scene-editor";
import { StatusChip } from "@/features/admin/status-chip";

export const metadata: Metadata = { title: "장면 편집 · nuanci" };

const ACTIONS: { status: AdminScene["status"]; label: string }[] = [
  { status: "published", label: "공개하기" },
  { status: "draft", label: "초안으로" },
  { status: "hidden", label: "숨기기" },
];

async function SceneDetail({ params, searchParams }: { params: PageProps<"/admin/scenes/[id]">["params"]; searchParams: PageProps<"/admin/scenes/[id]">["searchParams"] }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const scene = await getAdminScene(id);
  if (!scene) notFound();
  const { status, version, ...content } = scene;
  return (
    <>
      <div className="flex items-center gap-2">
        <StatusChip status={status} />
        <span className="text-[13px] text-paper-subtle">
          /scenes/{scene.number} · {scene.id} · v{version}
        </span>
      </div>
      <h1 className="mt-2 font-pixel-title text-[24px]">{scene.title}</h1>
      {saved && <p className="mt-2 text-[14px] text-gold">저장했어요. 미리보기로 확인해 보세요.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/admin/preview/${scene.id}`} className="blk-btn blk-btn-gold block">
          <span className="blk block bg-gold px-4 py-3 font-pixel text-[15px] text-ink">미리보기</span>
        </Link>
        {ACTIONS.filter((a) => a.status !== status).map((a) => (
          <form key={a.status} action={setSceneStatus.bind(null, scene.id, a.status)}>
            <button className="blk-btn block">
              <span className="blk block bg-cream px-4 py-3 font-pixel text-[15px] text-ink">{a.label}</span>
            </button>
          </form>
        ))}
      </div>
      <h2 className="mt-8 font-pixel text-[15px]">JSON 수정</h2>
      <p className="mt-1 text-[13px] text-paper-subtle">공개 상태는 위 버튼으로 바꿔요. 내용을 저장하면 새 버전이 되고, 이전 기록은 당시 버전을 그대로 가리켜요.</p>
      <div className="mt-3">
        <SceneEditor key={version} initial={JSON.stringify(content, null, 2)} />
      </div>
    </>
  );
}

export default function AdminScenePage(props: PageProps<"/admin/scenes/[id]">) {
  return (
    <Suspense fallback={<p className="font-pixel text-[15px] text-paper-subtle">불러오는 중…</p>}>
      <SceneDetail params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
