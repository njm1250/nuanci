import type { Metadata } from "next";
import Link from "next/link";
import { MePanel } from "@/features/account/me-panel";
import { BackButton } from "@/features/collection/back-button";
import { getScenes } from "@/features/scene/api";

export const metadata: Metadata = { title: "내 정보 · nuanci" };

export default async function MePage() {
  const total = (await getScenes()).length;
  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep">
      <main className="flex w-full max-w-[480px] flex-col bg-night px-4 pb-6">
        <header className="flex h-12 items-center">
          <Link href="/" className="-ml-2 flex h-11 items-center px-2 font-pixel text-[15px] text-gold">
            nuanci
          </Link>
          <BackButton />
        </header>
        <h1 className="mb-4 font-pixel-title text-[24px]">내 정보</h1>
        <MePanel total={total} contactEmail={process.env.CONTACT_EMAIL} />
      </main>
    </div>
  );
}
