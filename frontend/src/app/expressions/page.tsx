import type { Metadata } from "next";
import { bookEntry } from "@/features/collection/pairs";
import { PageShell } from "@/features/site/page-shell";
import { ExpressionBook } from "@/features/collection/expression-book";
import { getScene, getScenes } from "@/features/scene/api";
import type { Scene } from "@/features/scene/types";

export const metadata: Metadata = { title: "표현 모음 · nuanci", robots: { index: false, follow: true } };

export default async function ExpressionsPage() {
  const summaries = await getScenes();
  const scenes = (await Promise.all(summaries.map((s) => getScene(s.id)))).filter((s): s is Scene => s !== null);
  return (
    <PageShell title="표현 모음" note="이럴 땐 이렇게">
      <ExpressionBook entries={scenes.map(bookEntry)} />
    </PageShell>
  );
}
