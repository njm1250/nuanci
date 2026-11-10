import { BackButton } from "@/features/collection/back-button";
import { PageTitle } from "./page-title";
import { SiteHeader } from "./site-header";

// 일반 화면의 틀. 검은 면은 머리줄까지만 쓰고, 큰 제목과 내용은 밝은 바탕에 둔다. 검은 띠는 무대가 있는 화면에만 쓴다
export function PageShell({ title, note, back = true, backFallback, width = "max-w-[1080px]", children }: { title: string; note?: string; back?: boolean; backFallback?: string; width?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page text-fg break-keep">
      <SiteHeader left={back ? <BackButton fallback={backFallback} /> : undefined} />
      <main className={`mx-auto w-full ${width} px-4 pb-12 pt-5 md:px-8 md:pt-10`}>
        <div className="mb-6 md:mb-10">
          <PageTitle note={note}>{title}</PageTitle>
        </div>
        {children}
      </main>
    </div>
  );
}
