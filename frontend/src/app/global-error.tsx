"use client";

import { useEffect } from "react";
import { reportError } from "@/features/monitor/report";

// 루트 레이아웃까지 깨졌을 때 마지막으로 보이는 화면
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error.message || `root error ${error.digest ?? ""}`, error.stack);
  }, [error]);
  return (
    <html lang="ko">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#18171c", color: "#f6f4ee", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 16 }}>
          <p style={{ fontSize: 20, fontWeight: 700 }}>앗, 문제가 생겼어요</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 20px", background: "#c8f031", border: 0, fontWeight: 600 }}>
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
