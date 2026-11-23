import { ImageResponse } from "next/og";
import { LOGO_SIZE, logoDataUrl } from "@/features/site/logo";

// 안드로이드 앱(플레이 스토어 TWA)과 홈 화면 설치에 쓰는 아이콘. 딥 블루 바탕을 꽉 채우고 마크를 도트 칸 크기에 맞춰 가운데 둔다.
// maskable은 기기가 원·물방울 모양으로 깎아도 마크가 잘리지 않게 가운데 안전 영역(지름 80%) 안에 작게 둔다
const VARIANTS = {
  "192": { size: 192, cell: 4 },
  "512": { size: 512, cell: 11 },
  "maskable-512": { size: 512, cell: 9 },
} as const;
type Variant = keyof typeof VARIANTS;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_: Request, { params }: { params: Promise<{ variant: string }> }) {
  const v = VARIANTS[(await params).variant as Variant];
  if (!v) return new Response("not found", { status: 404 });
  const w = LOGO_SIZE.w * v.cell;
  const h = LOGO_SIZE.h * v.cell;
  const left = Math.round((v.size - w) / 2);
  const top = Math.round((v.size - h) / 2);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#09318d", paddingLeft: left, paddingTop: top }}>
        <img src={logoDataUrl()} width={w} height={h} alt="" />
      </div>
    ),
    { width: v.size, height: v.size },
  );
}
