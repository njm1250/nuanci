"use server";

import { adminFetch } from "./api";

export type QueryResult = {
  columns: string[];
  rows: (string | null)[][];
  truncated: boolean;
};
export type QueryState = {
  result?: QueryResult;
  error?: string;
  sql?: string;
} | null;

export async function runQuery(
  _: QueryState,
  form: FormData,
): Promise<QueryState> {
  // 폼으로 보낸 줄바꿈은 \r\n이 된다. 편집기 내용과 견줄 수 있게 \n으로 맞춘다
  const sql = String(form.get("sql") ?? "").replace(/\r\n/g, "\n");
  // SQL에 {{since}}를 쓰면 이 기간의 시작일로 바뀐다(0은 전체)
  const days = Math.max(0, Math.min(3650, Number(form.get("days") ?? 14) || 0));
  if (!sql.trim() || sql.length > 20000)
    return { error: "SQL은 1~20,000자로 입력해 주세요" };
  const res = await adminFetch("/api/admin/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, days }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    return {
      error: body.message ?? body.detail ?? `조회하지 못했습니다 (${res.status})`,
    };
  return { result: body, sql };
}
