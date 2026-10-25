"use client";

import { useState, useTransition } from "react";
import { setVisitorInternal } from "./actions";

export function CopyId({ value }: { value: string }) {
  const [message, setMessage] = useState("");
  return (
    <span className="adm-copy-id">
      <code>{value}</code>
      <button
        className="adm-btn adm-btn-sm"
        type="button"
        aria-label="ID 복사"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setMessage("복사됨");
          } catch {
            setMessage("복사 실패");
          }
        }}
      >
        복사
      </button>
      <span role="status">{message}</span>
    </span>
  );
}

export function InternalVisitorButton({
  id,
  internal,
}: {
  id: string;
  internal: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="adm-btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            try {
              const result = await setVisitorInternal(id, !internal);
              if (result.error) setError(result.error);
            } catch {
              setError("설정을 바꾸지 못했습니다. 다시 시도해 주세요.");
            }
          })
        }
      >
        {pending
          ? "변경 중…"
          : internal
            ? "내부 방문 해제"
            : "내부 방문으로 제외"}
      </button>
      {error && (
        <p className="adm-notice adm-notice-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
