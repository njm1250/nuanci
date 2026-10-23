import type { Metadata } from "next";
import { KitGallery } from "./kit-gallery";

export const metadata: Metadata = { title: "에셋 · nuanci" };

export default function KitPage() {
  return (
    <>
      <h1 className="font-pixel-title text-[24px]">에셋</h1>
      <p className="mt-1 text-[14px] leading-relaxed text-paper-muted">
        무대·인물·동작·소품을 골라 미리 보고, 아래 JSON 조각을 장면에 그대로 붙여 넣으세요. 과장된 동작(★)은 장면당 1~2번만 써요.
      </p>
      <KitGallery />
    </>
  );
}
