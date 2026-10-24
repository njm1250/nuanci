import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { MOCHI_SIZE, mochiSvg } from "@/features/mascot/mochi";

export const CARD_SIZE = { width: 1200, height: 630 };

const INK = "#141317";
const NIGHT = "#18171c";
const PAPER = "#f6f4ee";
const MUTED = "#a5a29b";
const LIME = "#c8f031";

// 공유 미리보기에 쓰는 픽셀 글꼴. 크기가 커서 굵은 글꼴 하나만 쓴다
async function font() {
  return readFile(join(process.cwd(), "node_modules/galmuri/dist/Galmuri11-Bold.ttf"));
}

const mochi = `data:image/svg+xml;base64,${Buffer.from(mochiSvg()).toString("base64")}`;

// 카톡·인스타에 링크를 붙였을 때 보이는 카드. 상대 대사와 내가 하고 싶은 말만 보여주고 답은 감춘다
export async function shareCard({ kicker, bubble, line, note }: { kicker: string; bubble?: string; line: string; note: string }) {
  const scale = 20;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: NIGHT, padding: 64, fontFamily: "Galmuri", color: PAPER }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 36, color: LIME }}>nuanci</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 36, color: MUTED }}>{kicker}</div>
            {bubble && (
              <div style={{ display: "flex", marginTop: 24, alignSelf: "flex-start", background: "#ffffff", color: INK, border: `6px solid ${INK}`, padding: "16px 24px", fontSize: 36, maxWidth: 640 }}>
                {bubble}
              </div>
            )}
            <div style={{ display: "flex", marginTop: 28, fontSize: 60, lineHeight: 1.25, maxWidth: 760 }}>{line}</div>
          </div>
          <div style={{ display: "flex", alignSelf: "flex-start", background: LIME, color: INK, padding: "14px 28px", fontSize: 36 }}>{note}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", width: 340 }}>
          <div style={{ display: "flex", fontSize: 120, color: LIME, marginBottom: 8 }}>?</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mochi} width={MOCHI_SIZE.w * scale} height={MOCHI_SIZE.h * scale} alt="" />
        </div>
      </div>
    ),
    { ...CARD_SIZE, fonts: [{ name: "Galmuri", data: await font(), weight: 700, style: "normal" }] },
  );
}
