import type { Metadata } from "next";
import Link from "next/link";
import { bookEntry } from "@/features/collection/pairs";
import { BackButton } from "@/features/collection/back-button";
import { ExpressionBook } from "@/features/collection/expression-book";
import { getScene, getScenes } from "@/features/scene/api";
import type { Scene } from "@/features/scene/types";

export const metadata: Metadata = { title: "표현 모음 · nuanci", robots: { index: false, follow: true } };

export default async function ExpressionsPage() {
  const summaries = await getScenes();
  const scenes = (await Promise.all(summaries.map((s) => getScene(s.id)))).filter((s): s is Scene => s !== null);
  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep">
      <main className="w-full max-w-[480px] bg-night px-4 pb-12 md:max-w-[1080px] md:px-8">
        <header className="flex h-12 items-center md:h-16">
          <Link href="/" className="-ml-2 flex h-11 items-center px-2 font-pixel text-[15px] text-paper">
            <span className="hl">nuanci</span>
          </Link>
          <BackButton />
        </header>
        <ExpressionBook entries={scenes.map(bookEntry)} />
      </main>
    </div>
  );
}
