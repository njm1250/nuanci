"use client";

import { useActionState, useRef, useState } from "react";
import { AdminEmpty, AdminPanel } from "@/features/admin/ui";
import { runQuery } from "@/features/admin/query-actions";

export type QueryTable = {
  name: string;
  columns: { name: string; type: string; nullable: boolean }[];
};
const DESCRIPTIONS: Record<string, string> = {
  scene: "장면 기본 정보 · id로 이벤트와 연결",
  scene_version: "장면 버전별 본문 · content는 JSONB",
  scene_event:
    "이용 이벤트 · visitor_id는 브라우저, user_id는 이벤트 당시 로그인 계정",
  app_user: "가입 계정 · id로 이벤트·완료 기록과 연결",
  user_visitor:
    "브라우저와 마지막 로그인 계정 연결 · 과거 이벤트 당시 상태와 다를 수 있어요",
  user_cleared: "계정별 완료 장면",
  internal_visitor: "지표에서 제외하는 관리자 브라우저",
};
const EXAMPLES = [
  {
    label: "장면별 시작·완료",
    sql: "SELECT scene_id,\n  count(DISTINCT attempt_id) FILTER (WHERE type = 'scene_viewed') AS started,\n  count(DISTINCT attempt_id) FILTER (WHERE type = 'scene_completed') AS completed\nFROM scene_event e\nWHERE NOT EXISTS (SELECT 1 FROM internal_visitor i WHERE i.visitor_id = e.visitor_id)\nGROUP BY scene_id\nORDER BY started DESC;",
  },
  {
    label: "일별 로그인 상태",
    sql: "SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day,\n  auth_state, count(DISTINCT visitor_id) AS browsers,\n  count(DISTINCT user_id) AS accounts, count(*) AS events\nFROM scene_event e\nWHERE NOT EXISTS (SELECT 1 FROM internal_visitor i WHERE i.visitor_id = e.visitor_id)\nGROUP BY day, auth_state\nORDER BY day DESC, auth_state;",
  },
  {
    label: "장면 목록",
    sql: "SELECT id, number, title, status, current_version\nFROM scene\nORDER BY sort_order;",
  },
];

export function QueryConsole({ tables }: { tables: QueryTable[] }) {
  const [sql, setSql] = useState(EXAMPLES[0].sql);
  const [search, setSearch] = useState("");
  const [state, action, pending] = useActionState(runQuery, null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const insert = (name: string) => {
    const field = editor.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    setSql(sql.slice(0, start) + name + sql.slice(end));
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + name.length, start + name.length);
    });
  };
  const needle = search.trim().toLowerCase();
  const filtered = tables.filter(
    (t) =>
      t.name.toLowerCase().includes(needle) ||
      t.columns.some((c) => c.name.toLowerCase().includes(needle)),
  );
  return (
    <div className="adm-query-layout">
      <aside className="adm-panel adm-schema">
        <div className="adm-panel-heading">
          <div>
            <h2>데이터베이스 스키마</h2>
            <p>{tables.length}개 테이블 · 컬럼을 누르면 커서 위치에 삽입</p>
          </div>
        </div>
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid var(--adm-stroke-neutral-subtle)",
          }}
        >
          <input
            className="adm-input"
            style={{ width: "100%" }}
            aria-label="테이블·컬럼 검색"
            placeholder="테이블 또는 컬럼 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filtered.map((table) => (
          <details
            className="adm-schema-table"
            key={`${table.name}:${needle}`}
            open={Boolean(needle) || table.name === "scene_event"}
          >
            <summary>
              {table.name}{" "}
              <span className="adm-muted">({table.columns.length})</span>
            </summary>
            <p>{DESCRIPTIONS[table.name] ?? "조회 가능한 테이블"}</p>
            <button
              type="button"
              className="adm-btn adm-btn-sm"
              onClick={() => insert(table.name)}
            >
              테이블명 삽입
            </button>
            <ul style={{ marginTop: 9 }}>
              {table.columns.map((c) => (
                <li key={c.name}>
                  <button
                    type="button"
                    title={`${table.name}.${c.name} 삽입`}
                    onClick={() => insert(`${table.name}.${c.name}`)}
                  >
                    {c.name}
                  </button>
                  <span>
                    {c.type}
                    {c.nullable ? " · NULL" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
        {!filtered.length && (
          <AdminEmpty>일치하는 테이블·컬럼이 없습니다.</AdminEmpty>
        )}
      </aside>
      <div style={{ minWidth: 0 }}>
        <AdminPanel
          title="쿼리 편집기"
          description="SELECT · WITH 조회 전용"
          action={
            <span className="adm-badge adm-badge-informative">읽기 전용</span>
          }
        >
          <form
            action={action}
            ref={form}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                if (!pending) form.current?.requestSubmit();
              }
            }}
          >
            <div className="adm-toolbar">
              <div className="adm-toolbar-group">
                <span className="adm-muted">예제</span>
                {EXAMPLES.map((example) => (
                  <button
                    type="button"
                    key={example.label}
                    onClick={() => setSql(example.sql)}
                    className="adm-btn adm-btn-sm"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="adm-panel-body">
              <label htmlFor="query-sql" className="sr-only">
                SQL 쿼리
              </label>
              <textarea
                ref={editor}
                id="query-sql"
                name="sql"
                required
                maxLength={20000}
                spellCheck={false}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                className="adm-code"
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: 300,
                  padding: 18,
                  resize: "vertical",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 14,
                  gap: 15,
                }}
              >
                <span className="adm-muted">
                  최대 500행 · 100컬럼 · 5초 · 셀당 4,000자
                </span>
                <button disabled={pending} className="adm-btn adm-btn-primary">
                  {pending ? "조회 중…" : "쿼리 실행"}
                  <span style={{ opacity: 0.6, fontSize: 10 }}>⌘ / Ctrl ↵</span>
                </button>
              </div>
            </div>
          </form>
        </AdminPanel>
        <p className="adm-notice adm-section-space">
          직접 쿼리는 내부 방문자를 자동으로 제외하지 않습니다. 예제의
          internal_visitor 제외 조건을 참고하세요. 세션·인증 토큰 테이블은
          조회할 수 없습니다.
        </p>
        <div
          aria-live="polite"
          aria-busy={pending}
          className="adm-section-space"
        >
          {state?.error && (
            <p role="alert" className="adm-notice adm-notice-danger">
              {state.error}
            </p>
          )}
          {state?.result ? (
            <AdminPanel
              title="조회 결과"
              description={`${state.result.rows.length}행 · ${state.result.columns.length}컬럼${pending ? " · 이전 조회 결과" : ""}`}
              action={
                state.result.truncated ? (
                  <span className="adm-badge adm-badge-warning">일부 결과</span>
                ) : undefined
              }
            >
              {state.sql !== sql && (
                <p
                  className="adm-notice adm-notice-warning"
                  style={{ margin: 14 }}
                >
                  편집기의 SQL이 변경되었습니다. 아래는 이전 쿼리의 결과입니다.
                </p>
              )}
              {state.result.truncated && (
                <div
                  className="adm-notice adm-notice-warning"
                  style={{ margin: 14 }}
                >
                  표시 한도에 도달했습니다. LIMIT·WHERE로 범위를 좁혀 주세요.
                </div>
              )}
              <div
                role="region"
                aria-label="SQL 조회 결과"
                tabIndex={0}
                className="adm-table-scroll"
              >
                <table
                  className="adm-table"
                  style={{ fontFamily: "monospace", fontSize: 11 }}
                >
                  <thead>
                    <tr>
                      <th className="adm-numeric">#</th>
                      {state.result.columns.map((col, i) => (
                        <th key={i}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.result.rows.map((row, i) => (
                      <tr key={i}>
                        <td className="adm-numeric adm-muted">{i + 1}</td>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            style={{
                              minWidth: 100,
                              maxWidth: 500,
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                              verticalAlign: "top",
                            }}
                          >
                            {cell === null ? (
                              <span
                                className="adm-muted"
                                style={{ fontStyle: "italic" }}
                              >
                                NULL
                              </span>
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!state.result.rows.length && (
                <AdminEmpty>조건에 맞는 결과가 없습니다.</AdminEmpty>
              )}
            </AdminPanel>
          ) : (
            !state?.error && (
              <AdminPanel title="조회 결과">
                <AdminEmpty>
                  쿼리를 실행하면 이곳에 결과가 표시됩니다.
                </AdminEmpty>
              </AdminPanel>
            )
          )}
        </div>
      </div>
    </div>
  );
}
