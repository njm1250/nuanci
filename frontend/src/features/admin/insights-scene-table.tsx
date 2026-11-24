"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminEmpty, number, percent } from "./ui";

export type SceneInsightRow = {
    sortOrder: number;
    id: string;
    title: string;
    viewers: number;
    picked: number;
    firstTries: number;
    firstWrong: number;
    completers: number;
    freeLineOpened: number;
};

function formatRatio(part: number, whole: number) {
    const base = `${number(part)}명 / ${number(whole)}명`;
    if (whole < 10) return base;
    return `${base} (${percent(part, whole)}%)`;
}

// 공개 장면 순서별 표. 행을 클릭하면 이용 지표의 해당 장면 상세로 이동한다
export function InsightsSceneTable({ rows }: { rows: SceneInsightRow[] }) {
    const router = useRouter();
    if (!rows.length) {
        return <AdminEmpty>공개된 장면이 없습니다.</AdminEmpty>;
    }
    return (
        <div className="adm-table-scroll">
            <table className="adm-table">
                <thead>
                    <tr>
                        <th className="adm-numeric">순서</th>
                        <th>id / 제목</th>
                        <th className="adm-numeric">진입</th>
                        <th className="adm-numeric">보기 선택</th>
                        <th className="adm-numeric">1단계 첫 선택 오답률</th>
                        <th className="adm-numeric">완료</th>
                        <th className="adm-numeric">완료 / 진입</th>
                        <th className="adm-numeric">입력 칸 열기</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const href = `/admin/metrics?scene=${encodeURIComponent(row.id)}`;
                        const wrongRatePct = row.firstTries >= 5
                            ? percent(row.firstWrong, row.firstTries)
                            : null;
                        const wrongOutOfRange = wrongRatePct !== null
                            && (wrongRatePct < 35 || wrongRatePct > 65);
                        return (
                            <tr
                                key={row.id}
                                style={{ cursor: "pointer" }}
                                onClick={(event) => {
                                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                                    if ((event.target as HTMLElement).closest("a")) return;
                                    router.push(href);
                                }}
                            >
                                <td className="adm-numeric">{number(row.sortOrder)}</td>
                                <td>
                                    <Link className="adm-title-link" href={href}>
                                        {row.title}
                                        <span className="adm-secondary">
                                            <code>{row.id}</code>
                                        </span>
                                    </Link>
                                </td>
                                <td className={`adm-numeric${row.viewers === 0 ? " adm-value-zero" : ""}`}>
                                    {number(row.viewers)}명
                                </td>
                                <td className={`adm-numeric${row.picked === 0 ? " adm-value-zero" : ""}`}>
                                    {number(row.picked)}명
                                </td>
                                <td className="adm-numeric">
                                    {row.firstTries < 5 ? (
                                        <span className="adm-value-zero">-</span>
                                    ) : wrongOutOfRange ? (
                                        <span className="adm-badge adm-badge-warning">
                                            {formatRatio(row.firstWrong, row.firstTries)}
                                        </span>
                                    ) : (
                                        formatRatio(row.firstWrong, row.firstTries)
                                    )}
                                </td>
                                <td className={`adm-numeric${row.completers === 0 ? " adm-value-zero" : ""}`}>
                                    {number(row.completers)}명
                                </td>
                                <td className="adm-numeric">
                                    {row.viewers < 5 ? (
                                        <span className="adm-value-zero">-</span>
                                    ) : (
                                        formatRatio(row.completers, row.viewers)
                                    )}
                                </td>
                                <td className={`adm-numeric${row.freeLineOpened === 0 ? " adm-value-zero" : ""}`}>
                                    {number(row.freeLineOpened)}명
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
