import { BackButton } from "@/features/collection/back-button";
import { PageTitle } from "./page-title";
import { SiteHeader } from "./site-header";

// 일반 화면의 틀. 검은 띠에 큰 제목을 세우고, 읽고 고르는 내용은 그 아래 밝은 바탕에 둔다
export function PageShell({ title, note, back = true, backFallback, width = "max-w-[1080px]", children }: { title: string; note?: string; back?: boolean; backFallback?: string; width?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-night text-paper break-keep">
      <SiteHeader left={back ? <BackButton fallback={backFallback} /> : undefined} />
      <section className="bg-ink text-paper">
        <div className={`mx-auto w-full ${width} px-4 pb-8 pt-3 md:px-8 md:pb-12 md:pt-6`}>
          <PageTitle note={note}>{title}</PageTitle>
        </div>
      </section>
      <main className={`mx-auto w-full ${width} px-4 pb-12 pt-6 md:px-8 md:pt-10`}>{children}</main>
    </div>
  );
}
