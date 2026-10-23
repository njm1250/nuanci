import Link from "next/link";

export default function SceneNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center bg-night px-6 text-paper break-keep">
      <p className="font-pixel-title text-[22px] leading-tight">이 장면은 지금 볼 수 없어요</p>
      <p className="mt-2 text-[15px] leading-relaxed text-paper/65">공개가 끝났거나 주소가 바뀐 장면이에요. 다른 장면을 먼저 둘러보세요.</p>
      <Link href="/" className="blk-btn blk-btn-gold mt-8 block">
        <span className="blk block bg-gold px-3 py-3 text-center font-pixel text-[15px] text-ink">다른 장면 보기</span>
      </Link>
    </main>
  );
}
