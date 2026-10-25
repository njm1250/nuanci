"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reorderScenes } from "./actions";
import type { AdminScene } from "./api";
import { StatusChip } from "./status-chip";
import { AdminEmpty, AdminPanel } from "./ui";

export function OrderEditor({ scenes }: { scenes: AdminScene[] }) {
  const router = useRouter();
  const byId = new Map(scenes.map((s) => [s.id, s]));
  const original = scenes.map((s) => s.id);
  const [ids, setIds] = useState(original);
  const [search, setSearch] = useState("");
  const [moved, setMoved] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const dirty = ids.some((id, i) => id !== original[i]);
  const move = (from: number, to: number) => {
    if (pending || to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    setIds(next);
    setMoved(id);
    setMessage(null);
  };
  const save = () =>
    startTransition(async () => {
      try {
        const result = await reorderScenes(ids);
        if (result.error) return setMessage({ ok: false, text: result.error });
        setMessage({
          ok: true,
          text: "순서를 저장했습니다. 서비스에 반영됩니다.",
        });
        router.refresh();
      } catch {
        setMessage({
          ok: false,
          text: "순서를 저장하지 못했습니다. 다시 시도해 주세요.",
        });
      }
    });
  const filtered = ids
    .map((id, i) => ({ s: byId.get(id)!, i }))
    .filter(({ s }) =>
      `${s.title} ${s.number} ${s.id}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    );
  return (
    <>
      <p className="adm-notice" style={{ marginBottom: 20 }}>
        초안·숨김을 포함한 전체 순서입니다. 서비스에는 공개 장면만 나타나며, 홈
        데모는 공개 장면 중 앞 3개를 사용합니다. 위치 변경 후 ‘순서 저장’을
        눌러야 반영됩니다.
      </p>
      <AdminPanel
        title="장면 순서"
        description={`${ids.length}개 · 검색 중에도 위치는 전체 목록 기준입니다.`}
      >
        <div className="adm-toolbar">
          <input
            className="adm-input"
            type="search"
            aria-label="순서 장면 검색"
            placeholder="옮길 장면 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span
            className={`adm-badge ${dirty ? "adm-badge-warning" : "adm-badge-neutral"}`}
          >
            {dirty ? "저장하지 않은 변경 있음" : "저장된 순서"}
          </span>
        </div>
        <div className="adm-table-scroll">
          <table className="adm-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th className="adm-numeric">위치</th>
                <th>장면</th>
                <th>상태</th>
                <th>변경</th>
                <th>이동할 위치</th>
                <th>한 칸 이동</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ s, i }) => (
                <tr
                  key={s.id}
                  className={moved === s.id ? "adm-selected" : undefined}
                >
                  <td className="adm-numeric">{i + 1}</td>
                  <td>
                    <Link
                      href={`/admin/scenes/${s.id}`}
                      className="adm-title-link"
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
                  <td className="adm-muted">
                    {original.indexOf(s.id) !== i
                      ? `${original.indexOf(s.id) + 1} → ${i + 1}`
                      : "—"}
                  </td>
                  <td>
                    <select
                      className="adm-select"
                      value={i}
                      disabled={pending}
                      onChange={(e) => move(i, Number(e.target.value))}
                      aria-label={`${s.title} 위치`}
                    >
                      {ids.map((_, n) => (
                        <option key={n} value={n}>
                          {n + 1}번째
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="adm-actions">
                      <button
                        type="button"
                        aria-label={`${s.title} 위로`}
                        className="adm-btn adm-btn-sm"
                        disabled={pending || i === 0}
                        onClick={() => move(i, i - 1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`${s.title} 아래로`}
                        className="adm-btn adm-btn-sm"
                        disabled={pending || i === ids.length - 1}
                        onClick={() => move(i, i + 1)}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <AdminEmpty>일치하는 장면이 없습니다.</AdminEmpty>
          )}
        </div>
      </AdminPanel>
      <div className="adm-editor-actions">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="adm-btn adm-btn-primary"
        >
          {pending ? "저장 중…" : "순서 저장"}
        </button>
        <button
          type="button"
          disabled={!dirty || pending}
          className="adm-btn"
          onClick={() => {
            setIds(original);
            setMoved(null);
            setMessage(null);
          }}
        >
          변경 되돌리기
        </button>
        {message && (
          <p
            role="status"
            style={{
              fontSize: 12,
              color: message.ok
                ? "var(--adm-fg-positive-contrast)"
                : "var(--adm-fg-critical-contrast)",
            }}
          >
            {message.text}
          </p>
        )}
      </div>
    </>
  );
}
