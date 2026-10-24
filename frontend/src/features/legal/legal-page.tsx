import Link from "next/link";
import { BackButton } from "@/features/collection/back-button";

// 약관·개인정보처리방침처럼 긴 글을 읽기 쉽게 보여주는 틀. 본문은 픽셀 글꼴 대신 일반 글꼴을 쓴다
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep md:bg-night">
      <main className="w-full max-w-[720px] bg-night px-4 pb-16 md:px-8">
        <header className="flex h-12 items-center md:h-16">
          <Link href="/" className="-ml-2 flex h-11 items-center px-2 font-pixel text-[15px] text-gold">
            nuanci
          </Link>
          <BackButton />
        </header>
        <h1 className="font-pixel-title text-[24px]">{title}</h1>
        <p className="mt-1 text-[13px] text-paper-subtle">시행일 {updated}</p>
        <article className="mt-8 space-y-8 text-[15px] leading-relaxed text-paper-muted [&_h2]:mb-2 [&_h2]:font-pixel [&_h2]:text-[15px] [&_h2]:text-paper [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-paper [&_table]:w-full [&_td]:border-t [&_td]:border-slate-block [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-paper [&_ul]:space-y-1">
          {children}
        </article>
      </main>
    </div>
  );
}

export function Contact({ email }: { email?: string }) {
  return email ? (
    <a href={`mailto:${email}`} className="text-gold underline underline-offset-4">
      {email}
    </a>
  ) : (
    <span>사이트 아래의 &lsquo;문의 / 오류 제보&rsquo;</span>
  );
}
