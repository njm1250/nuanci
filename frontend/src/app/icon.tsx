import { ImageResponse } from "next/og";
import { LOGO_SIZE, logoDataUrl, logoSvg } from "@/features/site/logo";

// 브라우저 탭 아이콘. 요즘 브라우저는 SVG를 쓰고, SVG 아이콘을 못 읽는 곳을 위해 32px PNG도 같이 알린다
export function generateImageMetadata() {
  return [
    { id: "png", size: { width: 32, height: 32 }, contentType: "image/png" },
    { id: "svg", contentType: "image/svg+xml" },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  if ((await id) === "svg") return new Response(logoSvg(), { headers: { "Content-Type": "image/svg+xml" } });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <img src={logoDataUrl()} width={LOGO_SIZE.w * 2} height={LOGO_SIZE.h * 2} alt="" />
      </div>
    ),
    { width: 32, height: 32 },
  );
}
