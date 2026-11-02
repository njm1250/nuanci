import type { Metadata } from "next";
import Link from "next/link";
import { MePanel } from "@/features/account/me-panel";
import { BackButton } from "@/features/collection/back-button";
import { getRanks } from "@/features/progression/api";
import { PageTitle } from "@/features/site/page-title";

export const metadata: Metadata = { title: "내 정보 · nuanci" };

export default async function MePage() {
  const { ranks } = await getRanks();
  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep md:bg-night">
      <main className="flex w-full max-w-[480px] flex-col bg-night px-4 pb-6 md:max-w-[1080px] md:px-8 md:pb-12">
        <header className="flex h-12 items-center md:h-16">
          <Link href="/" className="-ml-2 flex h-11 items-center px-2 font-pixel text-[15px] text-paper">
            <span className="hl">nuanci</span>
          </Link>
          <BackButton />
        </header>
        <div className="mb-6">
          <PageTitle>내 정보</PageTitle>
        </div>
        <MePanel ranks={ranks} />
      </main>
    </div>
  );
}
