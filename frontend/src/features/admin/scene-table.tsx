"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminScene } from "./api";
import { StatusChip } from "./status-chip";
import { AdminEmpty, adminTime } from "./ui";

export function SceneTable({ scenes }: { scenes: AdminScene[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [warning, setWarning] = useState(false);
  const [sort, setSort] = useState("order");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const rows = scenes
    .filter(
      (s) =>
        (status === "all" || s.status === status) &&
        (!warning || s.warnings.length > 0) &&
        `${s.title} ${s.id} ${s.number}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "updated"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : sort === "warnings"
          ? b.warnings.length - a.warnings.length || a.order - b.order
          : a.order - b.order,
    );
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages - 1);
  return (
    <section className="adm-panel">
      <div className="adm-toolbar">
        <div className="adm-toolbar-group">
          <input
            type="search"
            className="adm-input"
            placeholder="장면 제목, ID, 번호 검색"
            aria-label="장면 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <select
            className="adm-select"
            aria-label="공개 상태"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">모든 상태 ({scenes.length})</option>
            <option value="published">공개</option>
            <option value="draft">초안</option>
            <option value="hidden">숨김</option>
          </select>
          <label className="adm-muted">
            <input
              type="checkbox"
              checked={warning}
              onChange={(e) => {
                setWarning(e.target.checked);
                setPage(0);
              }}
            />{" "}
            경고 있는 장면만
          </label>
        </div>
        <select
          aria-label="장면 정렬"
          className="adm-select"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(0);
          }}
        >
          <option value="order">노출 순서</option>
          <option value="updated">최근 수정 순</option>
          <option value="warnings">경고 많은 순</option>
        </select>
      </div>
      <div className="adm-table-scroll">
        <table className="adm-table" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th className="adm-numeric">순서</th>
              <th>장면</th>
              <th>상태</th>
              <th className="adm-numeric">버전</th>
              <th>검수 상태</th>
              <th>수정 시각 · KST</th>
              <th>바로가기</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(current * size, (current + 1) * size).map((s) => (
              <tr key={s.id}>
                <td className="adm-numeric adm-muted">{s.order}</td>
                <td>
                  <Link
                    className="adm-title-link"
                    href={`/admin/scenes/${s.id}`}
                  >
                    {s.title}
                  </Link>
                  <code>
                    #{s.number} · {s.id}
                  </code>
                </td>
                <td>
                  <StatusChip status={s.status} />
                </td>
                <td className="adm-numeric">v{s.version}</td>
                <td style={{ maxWidth: 330 }}>
                  {s.warnings.length ? (
                    <details>
                      <summary className="adm-badge adm-badge-warning">
                        경고 {s.warnings.length}개
                      </summary>
                      <ul
                        style={{
                          marginTop: 8,
                          color: "var(--adm-fg-warning-contrast)",
                          fontSize: 11,
                        }}
                      >
                        {s.warnings.map((w) => (
                          <li key={w} style={{ marginBottom: 5 }}>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <span className="adm-muted">검사 통과</span>
                  )}
                </td>
                <td className="adm-muted" style={{ whiteSpace: "nowrap" }}>
                  {adminTime(s.updatedAt)}
                </td>
                <td>
                  <div className="adm-actions">
                    <Link
                      className="adm-btn adm-btn-sm"
                      href={`/admin/scenes/${s.id}`}
                    >
                      편집
                    </Link>
                    <Link
                      className="adm-btn adm-btn-sm"
                      href={`/admin/preview/${s.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      미리보기 ↗
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <AdminEmpty>검색 조건에 맞는 장면이 없습니다.</AdminEmpty>
        )}
      </div>
      <div className="adm-pagination">
        <span>
          총 {rows.length}개 중 {rows.length ? current * size + 1 : 0}–
          {Math.min((current + 1) * size, rows.length)}
        </span>
        <div className="adm-toolbar-group">
          <select
            className="adm-select"
            aria-label="페이지당 장면 수"
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(0);
            }}
          >
            <option value={25}>25개씩</option>
            <option value={50}>50개씩</option>
            <option value={10000}>전체 보기</option>
          </select>
          <button
            className="adm-btn adm-btn-sm"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            이전
          </button>
          <span>
            {current + 1} / {pages}
          </span>
          <button
            className="adm-btn adm-btn-sm"
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
          >
            다음
          </button>
        </div>
      </div>
    </section>
  );
}
