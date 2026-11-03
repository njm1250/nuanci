import type { Metadata } from "next";
import { PageShell } from "@/features/site/page-shell";
import { ExpressionBook } from "@/features/collection/expression-book";
import { getBook } from "@/features/scene/api";

export const metadata: Metadata = { title: "표현 모음 · nuanci", robots: { index: false, follow: true } };

export default async function ExpressionsPage() {
  const entries = await getBook();
  return (
    <PageShell title="표현 모음" note="이럴 땐 이렇게">
      <ExpressionBook entries={entries} />
    </PageShell>
  );
}
