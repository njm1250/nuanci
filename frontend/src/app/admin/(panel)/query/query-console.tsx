"use client";

import { useActionState, useState } from "react";
import { runQuery } from "@/features/admin/query-actions";

export type QueryTable = { name: string; columns: { name: string; type: string; nullable: boolean }[] };
const DESCRIPTIONS: Record<string, string> = {
  scene: "장면 기본 정보 · id로 이벤트와 연결",
  scene_version: "장면 버전별 본문 · content는 JSONB",
  scene_event: "이용 이벤트 · visitor_id는 브라우저, user_id는 이벤트 당시 로그인 계정",
  app_user: "가입 계정 · id로 이벤트·완료 기록과 연결",
  user_visitor: "브라우저와 마지막 로그인 계정 연결 · 과거 이벤트 당시 상태와 다를 수 있어요",
  user_cleared: "계정별 완료 장면",
  internal_visitor: "지표에서 제외하는 관리자 브라우저",
};
const EXAMPLES = [
  { label: "장면별 시작·완료", sql: "SELECT scene_id,\n  count(DISTINCT attempt_id) FILTER (WHERE type = 'scene_viewed') AS started,\n  count(DISTINCT attempt_id) FILTER (WHERE type = 'scene_completed') AS completed\nFROM scene_event e\nWHERE NOT EXISTS (SELECT 1 FROM internal_visitor i WHERE i.visitor_id = e.visitor_id)\nGROUP BY scene_id\nORDER BY started DESC;" },
  { label: "일별 로그인 상태", sql: "SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day,\n  auth_state, count(DISTINCT visitor_id) AS browsers,\n  count(DISTINCT user_id) AS accounts, count(*) AS events\nFROM scene_event e\nWHERE NOT EXISTS (SELECT 1 FROM internal_visitor i WHERE i.visitor_id = e.visitor_id)\nGROUP BY day, auth_state\nORDER BY day DESC, auth_state;" },
  { label: "장면 목록", sql: "SELECT id, number, title, status, current_version\nFROM scene\nORDER BY sort_order;" },
];

export function QueryConsole({ tables }: { tables: QueryTable[] }) {
  const [sql, setSql] = useState(EXAMPLES[0].sql);
  const [state, action, pending] = useActionState(runQuery, null);
  return <>
    <details className="mt-5 border border-paper/20 p-3" open>
      <summary className="cursor-pointer font-pixel text-[15px]">테이블·컬럼 참고 ({tables.length})</summary>
      <p className="mt-2 text-[13px] text-paper-subtle">테이블을 펼쳐 컬럼을 확인하세요. 로그인 세션·인증 토큰 테이블은 조회 대상에서 제외해요. 직접 쿼리는 내부 방문자를 자동으로 제외하지 않으므로 예제의 조건을 참고하세요.</p>
      <div className="mt-3 space-y-2">
        {tables.map((table) => <details key={table.name} className="bg-night-deep p-3">
          <summary className="cursor-pointer text-[14px]"><code className="text-gold">{table.name}</code><span className="ml-2 text-paper-subtle">{DESCRIPTIONS[table.name]}</span></summary>
          <ul className="mt-2 space-y-1 text-[13px]">{table.columns.map((c) => <li key={c.name} className="flex flex-wrap justify-between gap-x-3"><code>{c.name}</code><span className="text-paper-subtle">{c.type}{c.nullable ? " · NULL 허용" : " · 필수"}</span></li>)}</ul>
        </details>)}
      </div>
    </details>
    <form action={action} className="mt-5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]"><span className="text-paper-subtle">예제</span>{EXAMPLES.map((example) => <button key={example.label} type="button" onClick={() => setSql(example.sql)} className="border border-paper/20 px-2 py-2 hover:border-gold">{example.label}</button>)}</div>
      <label htmlFor="query-sql" className="font-pixel text-[15px]">SQL</label>
      <textarea id="query-sql" name="sql" required maxLength={20000} spellCheck={false} value={sql} onChange={(e) => setSql(e.target.value)} className="mt-2 min-h-64 w-full resize-y border border-paper/30 bg-night-deep p-3 font-mono text-[13px] leading-relaxed outline-gold" />
      <button disabled={pending} className="mt-3 bg-gold px-5 py-3 font-pixel text-ink disabled:opacity-50">{pending ? "조회 중…" : "조회 실행"}</button>
    </form>
    <div aria-live="polite" aria-busy={pending} className="mt-5">
      {state?.error && <p role="alert" className="text-rust-light">{state.error}</p>}
      {state?.result && <>
        <p className="text-[14px]">{state.result.rows.length}행{state.result.truncated ? " · 결과 일부만 표시했어요. LIMIT·WHERE로 범위를 좁혀 주세요." : ""}{pending ? " · 이전 조회 결과" : ""}</p>
        <div role="region" aria-label="SQL 조회 결과" tabIndex={0} className="mt-3 max-h-[600px] overflow-auto border border-paper/20">
          <table className="w-full whitespace-nowrap text-left font-mono text-[12px]">
            <thead className="sticky top-0 bg-slate-block"><tr>{state.result.columns.map((col, i) => <th key={i} className="border-b border-paper/20 p-3">{col}</th>)}</tr></thead>
            <tbody>{state.result.rows.map((row, i) => <tr key={i} className="even:bg-paper/5">{row.map((cell, j) => <td key={j} className="max-w-96 whitespace-pre-wrap break-all border-b border-paper/10 p-3 align-top">{cell === null ? <span className="text-paper-subtle">NULL</span> : cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
        {state.result.rows.length === 0 && <p className="mt-3 text-paper-subtle">조건에 맞는 결과가 없어요.</p>}
      </>}
    </div>
  </>;
}
