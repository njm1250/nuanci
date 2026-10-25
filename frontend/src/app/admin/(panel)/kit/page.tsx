import type { Metadata } from "next";
import { KitGallery } from "./kit-gallery";
import { AdminHeader } from "@/features/admin/ui";

export const metadata: Metadata = { title: "에셋 · nuanci" };

export default function KitPage() {
  return (
    <>
      <AdminHeader
        title="에셋 작업실"
        description="무대·인물·동작·소품을 조합하고 JSON을 장면에 붙여 넣으세요. 과장된 동작(★)은 장면당 1~2번, 기본 소품을 빼려면 stage.flags에 bare를 사용합니다."
      />
      <KitGallery />
    </>
  );
}
