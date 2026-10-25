import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminJson, getAdminScenes } from "@/features/admin/api";
import { SceneTable } from "@/features/admin/scene-table";
import {
  AdminHeader,
  AdminLoading,
  AdminPanel,
  AdminStat,
} from "@/features/admin/ui";
import { TRAP_LABELS, type Trap } from "@/features/scene/types";

export const metadata: Metadata = { title: "장면 관리 · nuanci" };
type SceneMix = {
  situations: number;
  traps: Record<Trap, number>;
  compositions: Record<string, number>;
  warnings: string[];
};

async function Content() {
  const [scenes, mix] = await Promise.all([
    getAdminScenes(),
    getAdminJson<SceneMix>("/api/admin/scenes/mix"),
  ]);
  const traps = mix
    ? (Object.entries(mix.traps) as [Trap, number][]).sort(
        (a, b) => b[1] - a[1],
      )
    : [];
  const max = Math.max(...traps.map(([, n]) => n), 1);
  return (
    <>
      <div className="adm-stats">
        <AdminStat label="전체 장면" tone="informative" value={scenes.length} />
        <AdminStat
          label="공개 중"
          tone="positive"
          value={scenes.filter((s) => s.status === "published").length}
        />
        <AdminStat
          label="초안"
          value={scenes.filter((s) => s.status === "draft").length}
        />
        <AdminStat
          label="숨김"
          value={scenes.filter((s) => s.status === "hidden").length}
        />
        <AdminStat
          label="검수 경고"
          tone={scenes.some((s) => s.warnings.length) ? "warning" : "neutral"}
          value={scenes.filter((s) => s.warnings.length).length}
          note="경고가 있는 장면 수"
        />
      </div>
      <SceneTable scenes={scenes} />
      {mix && (
        <div className="adm-grid adm-grid-2 adm-section-space">
          <AdminPanel
            title="함정 유형 분포"
            description={`초안·공개 장면의 상황 ${mix.situations}개 기준`}
          >
            <div
              className="adm-panel-body"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 24px",
              }}
            >
              {traps.map(([trap, n]) => (
                <div className="adm-mix-line" key={trap}>
                  <span>{TRAP_LABELS[trap]}</span>
                  <div className="adm-bar">
                    <span style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <strong>{n}</strong>
                </div>
              ))}
            </div>
          </AdminPanel>
          <AdminPanel title="판정 구성 · 검수 안내">
            <div className="adm-panel-body">
              <div className="adm-mix-tags">
                {Object.entries(mix.compositions).map(([key, n]) => (
                  <span key={key}>
                    {key}
                    <strong>{n}</strong>
                  </span>
                ))}
              </div>
              {mix.warnings.map((w) => (
                <p
                  className="adm-notice adm-notice-warning adm-section-space"
                  key={w}
                >
                  {w}
                </p>
              ))}
              <p className="adm-muted adm-section-space">
                공개하면 서비스에 바로 표시됩니다. 수정 전후의 이용 이벤트는 각
                시점의 장면 버전을 가리킵니다.
              </p>
            </div>
          </AdminPanel>
        </div>
      )}
    </>
  );
}

export default function ScenesPage() {
  return (
    <>
      <AdminHeader
        title="장면 관리"
        description="공개 상태, 검수 경고, 버전과 수정 시각을 한곳에서 확인합니다."
        actions={
          <>
            <Link className="adm-btn" href="/admin/order">
              노출 순서 편집
            </Link>
            <Link className="adm-btn adm-btn-primary" href="/admin/scenes/new">
              ＋ 새 장면 / 일괄 등록
            </Link>
          </>
        }
      />
      <Suspense fallback={<AdminLoading />}>
        <Content />
      </Suspense>
    </>
  );
}
