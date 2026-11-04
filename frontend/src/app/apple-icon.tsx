import { ImageResponse } from "next/og";
import { LOGO_SIZE, logoDataUrl } from "@/features/site/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// 홈 화면에 추가했을 때의 아이콘. iOS가 모서리를 둥글게 깎으니 딥 블루 바탕을 꽉 채우고, 마크(맨 아래 한 줄은 비어 있다)를 칸 크기에 맞춰 가운데 둔다
export default function AppleIcon() {
  const cell = 9;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#09318d", padding: "23px 18px" }}>
        <img src={logoDataUrl()} width={LOGO_SIZE.w * cell} height={LOGO_SIZE.h * cell} alt="" />
      </div>
    ),
    size,
  );
}
