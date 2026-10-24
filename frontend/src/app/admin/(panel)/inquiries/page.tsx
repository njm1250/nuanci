import type { Metadata } from "next";
import { Suspense } from "react";
import { markInquiry } from "@/features/admin/actions";
import { getAdminJson } from "@/features/admin/api";
import { Panel } from "@/features/scene/block-ui";

export const metadata: Metadata = { title: "문의 · nuanci" };

type Inquiry = {
  id: number;
  kind: "error" | "question" | "scene" | "idea";
  message: string;
  contact: string | null;
  page: string | null;
  email: string | null;
  userAgent: string | null;
  done: boolean;
  createdAt: string;
};

const KIND_LABELS: Record<Inquiry["kind"], string> = { error: "오류", question: "문의", scene: "표현 제보", idea: "기타" };

const time = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

async function InquiryList() {
  const inquiries = (await getAdminJson<Inquiry[]>("/api/admin/inquiries")) ?? [];
  if (inquiries.length === 0) return <p className="mt-6 text-[14px] text-paper-muted">아직 들어온 문의가 없어요.</p>;
  return (
    <ul className="mt-6 space-y-3">
      {inquiries.map((q) => (
        <li key={q.id} className={q.done ? "opacity-60" : ""}>
          <Panel>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-subtle">
                <span className="bg-ink px-1.5 py-0.5 font-pixel text-[12px] leading-none text-paper">{KIND_LABELS[q.kind]}</span>
                <span>{time(q.createdAt)}</span>
                {q.page && <span>· {q.page}</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{q.message}</p>
              {(q.contact || q.email) && (
                <p className="mt-2 text-[13px] text-ink-muted">
                  답장: {q.contact ?? "없음"}
                  {q.email && ` · 계정 ${q.email}`}
                </p>
              )}
              {q.userAgent && <p className="mt-1 break-all text-[12px] text-ink-subtle">{q.userAgent}</p>}
              <form action={markInquiry.bind(null, q.id, !q.done)} className="mt-3">
                <button type="submit" className="blk min-h-11 bg-cream px-3 font-pixel text-[13px] text-ink">
                  {q.done ? "처리 전으로" : "처리함"}
                </button>
              </form>
            </div>
          </Panel>
        </li>
      ))}
    </ul>
  );
}

export default function InquiriesPage() {
  return (
    <>
      <h1 className="font-pixel-title text-[24px]">문의</h1>
      <p className="mt-1 text-[14px] text-paper-muted">화면 안에서 보낸 문의·오류·표현 제보예요. 처리 전 문의가 먼저 나와요.</p>
      <Suspense fallback={<p className="mt-6 font-pixel text-[15px] text-paper-subtle">불러오는 중…</p>}>
        <InquiryList />
      </Suspense>
    </>
  );
}
