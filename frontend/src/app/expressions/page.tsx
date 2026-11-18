import type { Metadata } from "next";
import { PageShell } from "@/features/site/page-shell";
import { ExpressionBook } from "@/features/collection/expression-book";
import { getBook, getCatalog } from "@/features/scene/api";

export const metadata: Metadata = { title: "표현 모음 · nuanci", robots: { index: false, follow: true } };

export default async function ExpressionsPage() {
  const [entries, catalog] = await Promise.all([getBook(), getCatalog()]);
  // 장면 묶음 머리의 작은 썸네일에 쓴다
  const stages = Object.fromEntries(catalog.flatMap((s) => (s.stage ? [[s.id, s.stage]] : [])));
  return (
    <PageShell title="표현 모음" note="이럴 땐 이렇게">
      <ExpressionBook entries={entries} stages={stages} />
    </PageShell>
  );
}
