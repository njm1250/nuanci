"use client";

import { useState } from "react";
import Link from "next/link";
import type { DailyMetrics } from "./metrics-types";
import { AdminPanel, number } from "./ui";

export function ActivityTrend({
  days,
  period,
}: {
  days: DailyMetrics[];
  period: string;
}) {
  const [selected, setSelected] = useState(days.at(-1)?.day);
  const day = days.find((d) => d.day === selected) ?? days.at(-1);
  const max = Math.max(1, ...days.map((d) => d.visitors));
  if (!day) return null;
  return (
    <AdminPanel
      title="일별 활동 추이"
      description={`한국 시간 기준 · ${period === "all" ? "전체 기간 선택 시 그래프는 최근 30일" : "선택 기간"} · 막대를 눌러 날짜별 수치를 확인하세요.`}
      action={
        <Link
          className="adm-btn adm-btn-sm"
          href="/admin/users?kind=browsers&activity=active7"
        >
          활동 브라우저 탐색 →
        </Link>
      }
    >
      <div className="adm-panel-body">
        <div className="adm-trend-heading">
          <strong>{day.day}</strong>
          <span>
            <i className="adm-legend-new" /> 처음 관측
          </span>
          <span>
            <i className="adm-legend-return" /> 이전 관측 기록 있음
          </span>
        </div>
        <div className="adm-trend-scroll">
          <div
            className="adm-trend-chart"
            style={{ minWidth: days.length * 22 }}
          >
            {days.map((d, i) => (
              <button
                key={d.day}
                type="button"
                aria-pressed={d.day === day.day}
                aria-label={`${d.day}, 활동 브라우저 ${d.visitors}, 처음 관측 ${d.newVisitors}, 답변 완료 ${d.completed}`}
                title={`${d.day} · 브라우저 ${d.visitors} · 신규 ${d.newVisitors} · 완료 ${d.completed}`}
                onClick={() => setSelected(d.day)}
              >
                <span
                  className="adm-trend-bars"
                  style={{
                    height: `${Math.max(2, (d.visitors / max) * 130)}px`,
                  }}
                >
                  <span
                    className="adm-trend-return"
                    style={{ flex: d.visitors - d.newVisitors }}
                  />
                  <span
                    className="adm-trend-new"
                    style={{ flex: d.newVisitors }}
                  />
                </span>
                <small>
                  {i === 0 ||
                  i === days.length - 1 ||
                  i % Math.ceil(days.length / 8) === 0
                    ? d.day.slice(5)
                    : ""}
                </small>
              </button>
            ))}
          </div>
        </div>
        <div className="adm-trend-values">
          <span>
            활동 브라우저<strong>{number(day.visitors)}</strong>
          </span>
          <span>
            처음 관측<strong>{number(day.newVisitors)}</strong>
          </span>
          <span>
            이전 관측 기록 있음
            <strong>{number(day.visitors - day.newVisitors)}</strong>
          </span>
          <span>
            활동 로그인 계정<strong>{number(day.accounts)}</strong>
          </span>
          <span>
            답변 완료 시도<strong>{number(day.completed)}</strong>
          </span>
        </div>
        <p className="adm-muted" style={{ marginTop: 12 }}>
          처음 관측은 전체 이벤트 중 첫 날짜 기준입니다. 이전 기록이 있는
          브라우저도 같은 사람의 재방문을 보장하지 않습니다. 날짜별 인원을
          더하면 중복됩니다.
        </p>
        <details className="adm-trend-data">
          <summary>날짜별 원본 수치 보기</summary>
          <div className="adm-table-scroll" style={{ maxHeight: 300 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th className="adm-numeric">브라우저</th>
                  <th className="adm-numeric">처음 관측</th>
                  <th className="adm-numeric">이전 기록 있음</th>
                  <th className="adm-numeric">계정</th>
                  <th className="adm-numeric">완료 시도</th>
                </tr>
              </thead>
              <tbody>
                {days.toReversed().map((d) => (
                  <tr key={d.day}>
                    <td>{d.day}</td>
                    {[
                      d.visitors,
                      d.newVisitors,
                      d.visitors - d.newVisitors,
                      d.accounts,
                      d.completed,
                    ].map((n, i) => (
                      <td key={i} className="adm-numeric">
                        {number(n)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </AdminPanel>
  );
}
