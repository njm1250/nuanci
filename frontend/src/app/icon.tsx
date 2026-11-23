import { ImageResponse } from "next/og";
import { LOGO_SMALL_SIZE, logoSmallDataUrl, logoSmallSvg } from "@/features/site/logo";

// 브라우저 탭 아이콘. 요즘 브라우저는 SVG를 쓰고, SVG 아이콘을 못 읽는 곳을 위해 32px PNG도 같이 알린다.
// 탭에서는 16px로 보이니 작은 그림을 쓴다. PNG는 도트 한 칸을 2px로 그려 가운데 둔다
export function generateImageMetadata() {
  return [
    { id: "png", size: { width: 32, height: 32 }, contentType: "image/png" },
    { id: "svg", contentType: "image/svg+xml" },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  if ((await id) === "svg") return new Response(logoSmallSvg(), { headers: { "Content-Type": "image/svg+xml" } });
  const w = LOGO_SMALL_SIZE.w * 2;
  const h = LOGO_SMALL_SIZE.h * 2;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", paddingLeft: (32 - w) / 2, paddingTop: (32 - h) / 2 }}>
        <img src={logoSmallDataUrl()} width={w} height={h} alt="" />
      </div>
    ),
    { width: 32, height: 32 },
  );
}
