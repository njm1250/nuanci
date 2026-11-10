"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useInquiry } from "@/features/inquiry/inquiry-form";
import { reportError } from "@/features/monitor/report";

// 화면을 그리다 오류가 나면 서버에 남기고, 다시 시도하거나 홈으로 갈 수 있게 한다
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { open, element } = useInquiry();
  useEffect(() => {
    reportError(error.message || `render error ${error.digest ?? ""}`, error.stack);
  }, [error]);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page px-4 text-fg break-keep">
      <div className="w-full max-w-[400px] text-center">
        <p className="font-poster text-display-sm">앗, 문제가 생겼어요</p>
        <p className="mt-2 text-note text-fg-muted">잠시 뒤 다시 시도해 주세요. 오류는 자동으로 전달됐어요.</p>
        <button type="button" onClick={reset} className="blk-btn blk-btn-primary mt-6 block w-full">
          <span className="blk block bg-cta px-3 py-3 font-label text-ui text-cta-text">다시 시도</span>
        </button>
        <div className="mt-3 flex justify-center gap-4">
          <Link href="/" className="inline-flex min-h-11 items-center font-label text-ui text-fg-muted underline underline-offset-4">
            홈으로
          </Link>
          <button type="button" onClick={() => open("error")} className="inline-flex min-h-11 items-center font-label text-ui text-fg-muted underline underline-offset-4">
            무슨 일이었는지 알려 주기
          </button>
        </div>
        {element}
      </div>
    </div>
  );
}
