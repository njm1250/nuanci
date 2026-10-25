import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { setSceneStatus } from "@/features/admin/actions";
import { getAdminScene, type AdminScene } from "@/features/admin/api";
import { SceneEditor } from "@/features/admin/scene-editor";
import { StatusChip } from "@/features/admin/status-chip";
import { AdminHeader, AdminLoading } from "@/features/admin/ui";

export const metadata: Metadata = { title: "장면 편집 · nuanci" };

const ACTIONS: { status: AdminScene["status"]; label: string }[] = [
  { status: "published", label: "공개하기" },
  { status: "draft", label: "초안으로" },
  { status: "hidden", label: "숨기기" },
];

async function SceneDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/scenes/[id]">["params"];
  searchParams: PageProps<"/admin/scenes/[id]">["searchParams"];
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const scene = await getAdminScene(id);
  if (!scene) notFound();
  const { status, version, ...content } = scene;
  return (
    <>
      <AdminHeader
        title={scene.title}
        description={`/scenes/${scene.number} · ${scene.id} · 현재 v${version}`}
        actions={
          <Link href="/admin/scenes" className="adm-btn">
            ← 장면 목록
          </Link>
        }
      />
      <div
        className="adm-toolbar"
        style={{
          background: "var(--adm-bg-layer-default)",
          border: "1px solid var(--adm-stroke-neutral-weak)",
          borderRadius: 7,
          marginBottom: 20,
        }}
      >
        <div className="adm-toolbar-group">
          <StatusChip status={status} />
          <span className="adm-muted">
            공개 상태는 내용 저장과 별도로 변경됩니다.
          </span>
        </div>
        <div className="adm-actions">
          <Link
            href={`/admin/preview/${scene.id}`}
            target="_blank"
            rel="noreferrer"
            className="adm-btn adm-btn-sm"
          >
            미리보기 ↗
          </Link>
          {ACTIONS.filter((a) => a.status !== status).map((a) => (
            <form
              key={a.status}
              action={setSceneStatus.bind(null, scene.id, a.status)}
            >
              <button className="adm-btn adm-btn-sm">{a.label}</button>
            </form>
          ))}
        </div>
      </div>
      {saved && (
        <p
          role="status"
          className="adm-notice adm-notice-positive"
          style={{ marginBottom: 20 }}
        >
          저장했습니다. 미리보기에서 실제 장면을 확인하세요.
        </p>
      )}
      <div className="mt-3">
        <SceneEditor key={version} initial={JSON.stringify(content, null, 2)} />
      </div>
    </>
  );
}

export default function AdminScenePage(props: PageProps<"/admin/scenes/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <SceneDetail params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
