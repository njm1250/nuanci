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
  const sql = String(form.get("sql") ?? "");
  if (!sql.trim() || sql.length > 20000)
    return { error: "SQL은 1~20,000자로 입력해 주세요" };
  const res = await adminFetch("/api/admin/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    return {
      error: body.message ?? body.detail ?? `조회하지 못했어요 (${res.status})`,
    };
  return { result: body, sql };
}
