import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminJson } from "@/features/admin/api";
import { AdminHeader, AdminLoading } from "@/features/admin/ui";
import { ChartBoard, type Board } from "@/features/admin/chart-board";

export const metadata: Metadata = { title: "지표 보드 · nuanci" };

const PERIODS = [
  { days: 1, label: "오늘" },
  { days: 7, label: "7일" },
  { days: 14, label: "14일" },
  { days: 30, label: "30일" },
  { days: 0, label: "전체" },
];

async function Content({ days }: { days: number }) {
  const board = await getAdminJson<Board>(`/api/admin/charts/board?days=${days}`);
  if (!board) throw new Error("보드를 불러오지 못했습니다");
  return <ChartBoard board={board} />;
}

// 주소의 기간을 읽는 부분은 Suspense 안에 둔다(캐시 컴포넌트 모드에서 searchParams는 요청마다 달라진다)
async function Board({ searchParams }: { searchParams: PageProps<"/admin/board">["searchParams"] }) {
  const params = await searchParams;
  const asked = Number(typeof params.days === "string" ? params.days : 14);
  const days = PERIODS.some((p) => p.days === asked) ? asked : 14;
  return (
    <>
      <div className="adm-toolbar-group" style={{ marginBottom: 16 }}>
        <nav className="adm-tabs" aria-label="기간">
          {PERIODS.map((p) => (
            <Link key={p.days} href={`/admin/board?days=${p.days}`} aria-current={p.days === days ? "page" : undefined}>
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
      <Suspense key={days} fallback={<AdminLoading />}>
        <Content days={days} />
      </Suspense>
    </>
  );
}

export default function BoardPage(props: PageProps<"/admin/board">) {
  return (
    <>
      <AdminHeader
        title="지표 보드"
        description="저장한 조회를 같은 기간으로 모아 봅니다. 내부 방문·봇·출시 전 안드로이드 앱 방문은 지표 뷰(metrics)에서 이미 뺐습니다. 한국 날짜 기준."
        actions={
          <Link className="adm-btn adm-btn-sm" href="/admin/query">
            새 차트 만들기
          </Link>
        }
      />
      <Suspense fallback={<AdminLoading />}>
        <Board searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
