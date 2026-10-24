import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminJson } from "@/features/admin/api";
import { Panel } from "@/features/scene/block-ui";

export const metadata: Metadata = { title: "오류 · nuanci" };

type ClientError = { id: number; message: string; stack: string | null; url: string | null; userAgent: string | null; createdAt: string };

const time = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

async function ErrorList() {
  const errors = (await getAdminJson<ClientError[]>("/api/admin/errors")) ?? [];
  if (errors.length === 0) return <p className="mt-6 text-[14px] text-paper-muted">아직 들어온 오류가 없어요.</p>;
  return (
    <ul className="mt-6 space-y-3">
      {errors.map((e) => (
        <li key={e.id}>
          <Panel>
            <details className="p-4">
              <summary className="cursor-pointer list-none">
                <span className="block text-[12px] text-ink-subtle">
                  {time(e.createdAt)} · {e.url?.replace(/^https?:\/\/[^/]+/, "") || "주소 없음"}
                </span>
                <span className="mt-1 block break-all text-[14px] font-semibold">{e.message}</span>
              </summary>
              {e.stack && <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all bg-ink/5 p-2 font-mono text-[12px] leading-relaxed text-ink-muted">{e.stack}</pre>}
              {e.userAgent && <p className="mt-2 break-all text-[12px] text-ink-subtle">{e.userAgent}</p>}
            </details>
          </Panel>
        </li>
      ))}
    </ul>
  );
}

export default function ErrorsPage() {
  return (
    <>
      <h1 className="font-pixel-title text-[24px]">오류</h1>
      <p className="mt-1 text-[14px] text-paper-muted">사용자 화면에서 난 오류를 최근 100개까지 보여줘요. 누르면 자세한 내용이 나와요.</p>
      <Suspense fallback={<p className="mt-6 font-pixel text-[15px] text-paper-subtle">불러오는 중…</p>}>
        <ErrorList />
      </Suspense>
    </>
  );
}
