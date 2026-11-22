import type { Metadata } from "next";
import { PageShell } from "@/features/site/page-shell";
import { ExpressionBook } from "@/features/collection/expression-book";
import { getBook, getCatalog } from "@/features/scene/api";

export const metadata: Metadata = { title: "표현 모음 · nuanci", robots: { index: false, follow: true } };

export default async function ExpressionsPage() {
  const [entries, catalog] = await Promise.all([getBook(), getCatalog()]);
  // 장면 묶음 머리의 작은 썸네일에 쓴다
  const stages = Object.fromEntries(catalog.flatMap((s) => (s.stage ? [[s.id, s.stage]] : [])));
  // 도감 탭(상황별 묶음)을 나눌 때 쓴다. 묶음 규칙은 브라우저 쪽 모듈에 있어서 재료만 넘긴다
  const categories = Object.fromEntries(catalog.flatMap((s) => (s.category ? [[s.id, s.category]] : [])));
  return (
    <PageShell title="표현 모음" note="이럴 땐 이렇게">
      <ExpressionBook entries={entries} stages={stages} categories={categories} />
    </PageShell>
  );
}
