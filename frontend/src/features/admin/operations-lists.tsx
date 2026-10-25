"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { markInquiry } from "./actions";
import type { ClientError, Inquiry } from "./metrics-types";
import { AdminEmpty, AdminPanel, AdminStat, adminTime } from "./ui";

const KINDS: Record<Inquiry["kind"], string> = {
  error: "오류",
  question: "문의",
  scene: "표현 제보",
  idea: "기타",
};
function InquiryButton({ done }: { done: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`adm-btn adm-btn-sm ${done ? "" : "adm-btn-primary"}`}
    >
      {pending ? "변경 중…" : done ? "처리 전으로 되돌리기" : "처리 완료"}
    </button>
  );
}

export function InquiryInbox({ inquiries }: { inquiries: Inquiry[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const rows = inquiries.filter(
    (q) =>
      (status === "all" || q.done === (status === "done")) &&
      (kind === "all" || q.kind === kind) &&
      `${q.message} ${q.contact ?? ""} ${q.email ?? ""} ${q.page ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <div
        className="adm-stats"
        style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}
      >
        <AdminStat
          label="조회된 문의"
          tone="informative"
          value={inquiries.length}
          note="처리 전 우선 · 최근 최대 200건"
        />
        <AdminStat
          label="처리 전"
          tone={inquiries.some((q) => !q.done) ? "warning" : "neutral"}
          value={inquiries.filter((q) => !q.done).length}
        />
        <AdminStat
          label="처리함"
          tone="positive"
          value={inquiries.filter((q) => q.done).length}
        />
      </div>
      <AdminPanel
        title="문의함"
        description="제보 내용과 연락처를 함께 확인하고 처리 상태를 관리합니다."
      >
        <div className="adm-toolbar">
          <div className="adm-toolbar-group">
            <input
              type="search"
              className="adm-input"
              aria-label="문의 검색"
              placeholder="내용, 연락처, 페이지 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="문의 처리 상태"
              className="adm-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">모든 상태</option>
              <option value="pending">처리 전</option>
              <option value="done">처리함</option>
            </select>
            <select
              aria-label="문의 종류"
              className="adm-select"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="all">모든 종류</option>
              {Object.entries(KINDS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <span className="adm-muted">{rows.length}건</span>
        </div>
        {rows.map((q) => (
          <article
            key={q.id}
            id={`inquiry-${q.id}`}
            className="adm-inquiry-row"
            style={{ scrollMarginTop: 85 }}
          >
            <header>
              <span
                className={`adm-badge ${q.done ? "adm-badge-success" : "adm-badge-warning"}`}
              >
                {q.done ? "처리함" : "처리 전"}
              </span>
              <p style={{ marginTop: 9, fontSize: 12, fontWeight: 600 }}>
                {KINDS[q.kind]}
              </p>
              <p className="adm-secondary">#{q.id}</p>
              <p className="adm-secondary">{adminTime(q.createdAt)}</p>
            </header>
            <div>
              <p className="adm-inquiry-message">{q.message}</p>
              {q.page && (
                <p className="adm-secondary" style={{ marginTop: 12 }}>
                  접수 페이지: {q.page}
                </p>
              )}
              {q.userAgent && (
                <details style={{ marginTop: 10 }}>
                  <summary className="adm-muted">브라우저 정보</summary>
                  <p className="adm-stack" style={{ marginTop: 8 }}>
                    {q.userAgent}
                  </p>
                </details>
              )}
            </div>
            <aside>
              <p className="adm-muted">답장 연락처</p>
              <p style={{ marginTop: 4, fontSize: 12 }}>
                {q.contact || "미입력"}
              </p>
              {q.email && (
                <p className="adm-secondary">로그인 계정: {q.email}</p>
              )}
              <form
                action={markInquiry.bind(null, q.id, !q.done)}
                style={{ marginTop: 14 }}
              >
                <InquiryButton done={q.done} />
              </form>
            </aside>
          </article>
        ))}
        {!rows.length && <AdminEmpty>조건에 맞는 문의가 없습니다.</AdminEmpty>}
      </AdminPanel>
    </>
  );
}

export function ErrorLog({ errors }: { errors: ClientError[] }) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState(true);
  const filtered = errors.filter((e) =>
    `${e.message} ${e.url ?? ""} ${e.stack ?? ""} ${e.userAgent ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const groups = new Map<string, ClientError[]>();
  filtered.forEach((e) => {
    const key = group ? `${e.message}\n${e.url ?? ""}` : String(e.id);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  });
  return (
    <>
      <div
        className="adm-stats"
        style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}
      >
        <AdminStat
          label="최근 오류 이벤트"
          tone={errors.length ? "critical" : "neutral"}
          value={errors.length}
          note="최신 최대 100건 · 누적 전체 아님"
        />
        <AdminStat
          label="서로 다른 오류 메시지"
          tone={errors.length ? "critical" : "neutral"}
          value={new Set(errors.map((e) => e.message)).size}
        />
        <AdminStat
          label="영향받은 URL"
          tone="informative"
          value={new Set(errors.map((e) => e.url).filter(Boolean)).size}
        />
      </div>
      <AdminPanel
        title="오류 로그"
        description="같은 메시지와 URL은 묶어서 확인할 수 있습니다."
      >
        <div className="adm-toolbar">
          <input
            type="search"
            aria-label="오류 검색"
            className="adm-input"
            placeholder="메시지, URL, 스택, 브라우저 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="adm-toolbar-group">
            <label className="adm-muted">
              <input
                type="checkbox"
                checked={group}
                onChange={(e) => setGroup(e.target.checked)}
              />{" "}
              동일 오류 묶기
            </label>
            <span className="adm-muted">
              {filtered.length}건 · {groups.size}행
            </span>
          </div>
        </div>
        {[...groups].map(([key, items]) => {
          const e = items[0];
          return (
            <details key={key} className="adm-log-details">
              <summary>
                <span>
                  {adminTime(e.createdAt)}
                  <span className="adm-secondary">
                    #{e.id}
                    {items.length > 1 && ` 외 ${items.length - 1}건`}
                  </span>
                </span>
                <strong>{e.message}</strong>
                <span>
                  {e.url?.replace(/^https?:\/\/[^/]+/, "") || "주소 없음"}
                </span>
                <span>＋</span>
              </summary>
              {e.url && (
                <p className="adm-muted" style={{ marginBottom: 10 }}>
                  전체 URL: {e.url}
                </p>
              )}
              {e.stack ? (
                <pre className="adm-stack">{e.stack}</pre>
              ) : (
                <p className="adm-muted">스택 정보가 없습니다.</p>
              )}
              {items.length > 1 && (
                <div style={{ marginTop: 12 }}>
                  <p className="adm-muted">같은 오류의 발생 기록</p>
                  {items.map((item) => (
                    <details
                      key={item.id}
                      style={{
                        padding: "8px 0",
                        borderBottom:
                          "1px solid var(--adm-stroke-neutral-subtle)",
                      }}
                    >
                      <summary
                        className="adm-muted"
                        style={{ display: "block", marginBottom: 0 }}
                      >
                        #{item.id} · {adminTime(item.createdAt)} · 개별
                        스택·브라우저
                      </summary>
                      {item.stack && (
                        <pre className="adm-stack" style={{ marginTop: 8 }}>
                          {item.stack}
                        </pre>
                      )}
                      <p className="adm-muted" style={{ marginTop: 8 }}>
                        {item.userAgent || "브라우저 정보 없음"}
                      </p>
                    </details>
                  ))}
                </div>
              )}
              {items.length === 1 && (
                <p className="adm-muted" style={{ marginTop: 10 }}>
                  {e.userAgent || "브라우저 정보 없음"}
                </p>
              )}
            </details>
          );
        })}
        {!filtered.length && (
          <AdminEmpty>조건에 맞는 오류가 없습니다.</AdminEmpty>
        )}
      </AdminPanel>
    </>
  );
}
