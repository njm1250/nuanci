import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminJson } from "@/features/admin/api";
import {
    HygieneSection,
    NewFeaturesSection,
    ReachSection,
    ScenesSection,
    type InsightsResponse,
} from "@/features/admin/insights-sections";
import { AdminHeader, AdminLoading, AdminPanel } from "@/features/admin/ui";

export const metadata: Metadata = { title: "핵심 질문 · nuanci" };

const DEFAULT_SINCE = "2026-10-23";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: string | string[] | undefined) {
    return typeof value === "string" && DATE_RE.test(value) ? value : "";
}

async function Content({ searchParams }: PageProps<"/admin/insights">) {
    const params = await searchParams;
    const since = parseDateParam(params.since) || DEFAULT_SINCE;
    const pivot = parseDateParam(params.pivot);

    const query = new URLSearchParams({ since });
    if (pivot) query.set("pivot", pivot);

    const data = await getAdminJson<InsightsResponse>(`/api/admin/insights?${query}`);
    if (!data) throw new Error("핵심 질문 지표를 불러오지 못했습니다.");

    return (
        <>
            <AdminPanel>
                <form
                    action="/admin/insights"
                    method="get"
                    className="adm-toolbar"
                    key={`${since}:${pivot}`}
                >
                    <div className="adm-toolbar-group">
                        <label className="adm-filter-check">
                            <span>시작일</span>
                            <input
                                className="adm-input"
                                type="date"
                                name="since"
                                defaultValue={since}
                            />
                        </label>
                        <label className="adm-filter-check">
                            <span>비교 기준일 (선택)</span>
                            <input
                                className="adm-input"
                                type="date"
                                name="pivot"
                                defaultValue={pivot}
                            />
                        </label>
                        <button type="submit" className="adm-btn adm-btn-primary adm-btn-sm">
                            조회
                        </button>
                        {(since !== DEFAULT_SINCE || pivot) && (
                            <Link href="/admin/insights" className="adm-btn adm-btn-sm">
                                초기화
                            </Link>
                        )}
                    </div>
                    <span className="adm-muted">
                        외부 사람 = 내부·봇 제외 + 사람 신호 1회 이상 · 날짜 기준 Asia/Seoul
                    </span>
                </form>
            </AdminPanel>

            <ReachSection data={data} />
            <ScenesSection scenes={data.scenes} since={data.since} />
            <NewFeaturesSection data={data} />
            <HygieneSection hygiene={data.hygiene} since={data.since} />
        </>
    );
}

export default function InsightsPage(props: PageProps<"/admin/insights">) {
    return (
        <>
            <AdminHeader
                title="핵심 질문"
                description="외부 사람 도달·재방문, 장면별 난이도, 새 장치 사용 현황과 데이터 위생을 한 화면에서 확인합니다."
            />
            <Suspense fallback={<AdminLoading />}>
                <Content {...props} />
            </Suspense>
        </>
    );
}
