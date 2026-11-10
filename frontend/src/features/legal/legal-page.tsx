import { PageShell } from "@/features/site/page-shell";

// 약관·개인정보처리방침처럼 긴 글을 읽기 쉽게 보여주는 틀. 본문은 픽셀 글꼴 대신 일반 글꼴을 쓴다
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <PageShell title={title} width="max-w-[720px]">
        <p className="text-note text-fg-subtle">시행일 {updated}</p>
        <article className="mt-8 space-y-8 text-ui leading-relaxed text-fg-muted [&_h2]:mb-2 [&_h2]:font-poster [&_h2]:text-say [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-fg [&_table]:w-full [&_td]:border-t [&_td]:border-surface-strong [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-fg [&_ul]:space-y-1">
          {children}
        </article>
    </PageShell>
  );
}

export function Contact({ email }: { email?: string }) {
  return email ? (
    <a href={`mailto:${email}`} className="text-pink underline underline-offset-4">
      {email}
    </a>
  ) : (
    <span>사이트 아래의 &lsquo;문의 / 오류 제보&rsquo;</span>
  );
}
