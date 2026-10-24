import type { Metadata } from "next";
import Link from "next/link";
import { RoomView } from "@/features/account/room-view";
import { BackButton } from "@/features/collection/back-button";

export const metadata: Metadata = { title: "내 픽셀 방 · nuanci" };

export default function RoomPage() {
  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep">
      <main className="w-full max-w-[480px] bg-night px-4 pb-12">
        <header className="flex h-12 items-center">
          <Link href="/" className="-ml-2 flex h-11 items-center px-2 font-pixel text-[15px] text-gold">
            nuanci
          </Link>
          <BackButton />
        </header>
        <h1 className="mb-4 font-pixel-title text-[24px]">내 픽셀 방</h1>
        <RoomView />
      </main>
    </div>
  );
}
