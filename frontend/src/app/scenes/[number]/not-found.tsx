import { BlockLink } from "@/features/scene/block-ui";

export default function SceneNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center bg-night px-6 text-paper break-keep">
      <p className="font-pixel-title text-[24px] leading-[1.25]">이 장면은 지금 볼 수 없어요</p>
      <p className="mt-2 text-[15px] leading-relaxed text-paper-muted">공개가 끝났거나 주소가 바뀐 장면이에요. 다른 장면을 먼저 둘러보세요.</p>
      <BlockLink href="/" primary className="mt-8">
        다른 장면 보기
      </BlockLink>
    </main>
  );
}
