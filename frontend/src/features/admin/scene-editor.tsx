"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveScene } from "./actions";
import { AdminPanel } from "./ui";

// 편집 중인 JSON을 유지하며 검사 결과와 저장 결과를 같은 작업 영역에서 확인한다.
export function SceneEditor({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [state, action, pending] = useActionState(saveScene, null);
  const summary = useMemo(() => {
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return {
        valid: true,
        items: list.filter(
          (s): s is Record<string, unknown> =>
            s !== null && typeof s === "object",
        ),
      };
    } catch {
      return { valid: false, items: [] };
    }
  }, [text]);
  return (
    <form action={action}>
      <div className="adm-editor-layout">
        <div style={{ minWidth: 0 }}>
          <AdminPanel
            title="장면 JSON"
            description="단일 객체 또는 여러 장면 배열을 붙여 넣을 수 있습니다."
            action={
              <span
                className={`adm-badge ${summary.valid ? "adm-badge-success" : "adm-badge-warning"}`}
              >
                {summary.valid ? "JSON 구문 정상" : "JSON 구문 확인 필요"}
              </span>
            }
          >
            <label htmlFor="scene-json" className="sr-only">
              장면 JSON
            </label>
            <textarea
              id="scene-json"
              name="json"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              className="adm-code"
              style={{
                display: "block",
                width: "100%",
                height: "65dvh",
                minHeight: 420,
                padding: 20,
                resize: "vertical",
                borderRadius: 0,
              }}
            />
          </AdminPanel>
          <div className="adm-editor-actions">
            <button
              name="intent"
              value="check"
              disabled={pending}
              className="adm-btn"
            >
              검사하기
            </button>
            <button
              name="intent"
              value="save"
              disabled={pending}
              className="adm-btn adm-btn-primary"
            >
              {pending ? "처리 중…" : "변경 내용 저장"}
            </button>
            <span className="adm-muted">
              {text === initial ? "원본과 동일" : "편집한 내용 있음"} ·{" "}
              {text.split("\n").length}줄
            </span>
          </div>
          {state?.error && (
            <p role="alert" className="adm-notice adm-notice-danger">
              {state.error}
            </p>
          )}
          {state?.ok && (
            <p role="status" className="adm-notice adm-notice-positive">
              {state.ok}
            </p>
          )}
          {state?.warnings?.map((w) => (
            <p
              className="adm-notice adm-notice-warning"
              style={{ marginTop: 8 }}
              key={w}
            >
              {w}
            </p>
          ))}
          {state?.results && (
            <AdminPanel title="일괄 처리 결과">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>장면 ID</th>
                    <th>처리 결과</th>
                  </tr>
                </thead>
                <tbody>
                  {state.results.map((r, i) => (
                    <tr key={`${r.id}-${i}`}>
                      <td>
                        <Link
                          className="adm-title-link"
                          href={`/admin/scenes/${r.id}`}
                        >
                          {r.id}
                        </Link>
                      </td>
                      <td>
                        {r.error ? (
                          <p
                            style={{ color: "var(--adm-fg-critical-contrast)" }}
                          >
                            {r.error}
                          </p>
                        ) : (
                          <>
                            <p>{r.ok}</p>
                            {r.warnings?.map((w) => (
                              <p key={w} className="adm-secondary">
                                {w}
                              </p>
                            ))}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminPanel>
          )}
        </div>
        <AdminPanel title="편집 참고" className="adm-editor-summary">
          <div className="adm-panel-body">
            <h3>입력한 장면</h3>
            {summary.valid ? (
              <>
                <p>{summary.items.length}개 객체</p>
                <ul style={{ maxHeight: 260, overflow: "auto", marginTop: 10 }}>
                  {summary.items.map((s, i) => (
                    <li style={{ fontSize: 11, marginBottom: 9 }} key={i}>
                      <strong>
                        {(typeof s.title === "string" && s.title) ||
                          "제목 없음"}
                      </strong>
                      <span className="adm-secondary">
                        {typeof s.id === "string" ? s.id : "ID 없음"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>JSON 구문을 확인하면 여기에 제목과 ID가 표시됩니다.</p>
            )}
            <hr />
            <h3>검사와 저장</h3>
            <p>
              ‘검사하기’는 서버의 장면 형식과 선택지 구성을 확인하고 저장하지
              않습니다. 구문 정상 표시는 장면 검사 통과를 뜻하지 않습니다.
            </p>
            <p style={{ marginTop: 9 }}>
              내용을 저장하면 변경된 장면에 새 버전이 만들어집니다. 공개 상태는
              장면 상단의 별도 버튼으로 변경합니다.
            </p>
            <hr />
            <Link
              className="adm-btn adm-btn-sm"
              href="/admin/kit"
              target="_blank"
              rel="noreferrer"
            >
              에셋 작업실 열기 ↗
            </Link>
          </div>
        </AdminPanel>
      </div>
    </form>
  );
}
