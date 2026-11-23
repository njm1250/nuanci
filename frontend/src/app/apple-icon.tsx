import { ImageResponse } from "next/og";
import { LOGO_SIZE, logoDataUrl } from "@/features/site/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// 홈 화면에 추가했을 때의 아이콘. iOS가 모서리를 둥글게 깎으니 딥 블루 바탕을 꽉 채우고, 마크를 칸 크기에 맞춰 가운데 둔다
export default function AppleIcon() {
  const cell = 4;
  const w = LOGO_SIZE.w * cell;
  const h = LOGO_SIZE.h * cell;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#09318d", paddingLeft: (size.width - w) / 2, paddingTop: (size.height - h) / 2 }}>
        <img src={logoDataUrl()} width={w} height={h} alt="" />
      </div>
    ),
    size,
  );
}
