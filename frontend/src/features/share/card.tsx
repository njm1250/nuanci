import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties, ReactNode } from "react";
import { ImageResponse } from "next/og";
import { MOCHI_SIZE, mochiSvg } from "@/features/mascot/mochi";
import { LOGO_SIZE, logoDataUrl } from "@/features/site/logo";

export const CARD_SIZE = { width: 1200, height: 630 };

// 종이 화면과 같은 색. 테스트 결과 카드도 같은 색과 블록을 쓴다
export const INK = "#141317";
export const PAPER = "#f3f4f0";
export const RULE = "#e7e9e3";
export const CARD = "#ffffff";
export const SUBTLE = "#55535a";
export const LIME = "#c8f031";
export const BAD = "#ff6b6b";

// 테두리 굵기이자 계단 모서리·말꼬리의 한 칸
const CELL = 6;

const logo = logoDataUrl();
const mochi = `data:image/svg+xml;base64,${Buffer.from(mochiSvg()).toString("base64")}`;

// 한글은 픽셀 글꼴 굵게 하나만, 영어 대사는 화면처럼 손글씨로 쓴다
async function fonts() {
  const [galmuri, pangolin] = await Promise.all([
    readFile(join(process.cwd(), "node_modules/galmuri/dist/Galmuri11-Bold.ttf")),
    readFile(join(process.cwd(), "node_modules/@fontsource/pangolin/files/pangolin-latin-400-normal.woff")),
  ]);
  return [
    { name: "Galmuri", data: galmuri, weight: 700 as const, style: "normal" as const },
    { name: "Pangolin", data: pangolin, weight: 400 as const, style: "normal" as const },
  ];
}

// 글이 길수록 글자를 줄여서 정해진 줄 수 안에 들어가게 한다
export function fit(text: string, steps: [number, number][]) {
  return (steps.find(([max]) => text.length <= max) ?? steps[steps.length - 1])[1];
}

// 화면의 계단 모서리 블록. 테두리 바깥 모서리 한 칸을 바탕색으로 지우고 안쪽에 먹색 한 칸을 더 찍는다
export function Block({ children, bg = CARD, style }: { children: ReactNode; bg?: string; style?: CSSProperties }) {
  const dot = (color: string, pos: CSSProperties) => <div style={{ position: "absolute", width: CELL, height: CELL, background: color, ...pos }} />;
  const out = -CELL;
  return (
    <div style={{ display: "flex", position: "relative", background: bg, border: `${CELL}px solid ${INK}`, ...style }}>
      {children}
      {dot(PAPER, { top: out, left: out })}
      {dot(PAPER, { top: out, right: out })}
      {dot(PAPER, { bottom: out, left: out })}
      {dot(PAPER, { bottom: out, right: out })}
      {dot(INK, { top: 0, left: 0 })}
      {dot(INK, { top: 0, right: 0 })}
      {dot(INK, { bottom: 0, left: 0 })}
      {dot(INK, { bottom: 0, right: 0 })}
    </div>
  );
}

// 말풍선 꼬리. 블록 아래 테두리 줄부터 계단으로 내려간다
export function Tail({ bg = CARD, flip = false }: { bg?: string; flip?: boolean }) {
  const rows = ["kwwwk", "kwwk.", "kwk..", "kk..."].map((r) => (flip ? [...r].reverse().join("") : r));
  const rects = rows.flatMap((row, y) => [...row].map((ch, x) => (ch === "." ? "" : `<rect x="${x}" y="${y}" width="1" height="1" fill="${ch === "k" ? INK : bg}"/>`))).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 4" shape-rendering="crispEdges">${rects}</svg>`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} width={5 * CELL} height={4 * CELL} alt="" style={{ position: "absolute", top: "100%", ...(flip ? { right: 4 * CELL } : { left: 4 * CELL }) }} />
  );
}

// 화면의 .hl처럼 글자 아래쪽 절반만 형광펜으로 칠한다. 글자 줄은 그대로 두고 칠만 양옆으로 조금 삐져나온다
export function Marker({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", position: "relative", ...style }}>
      <div style={{ position: "absolute", left: -10, right: -10, top: "45%", bottom: "8%", background: LIME }} />
      <div style={{ display: "flex" }}>{children}</div>
    </div>
  );
}

export function Lockup() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} width={LOGO_SIZE.w * 4} height={LOGO_SIZE.h * 4} alt="" style={{ marginTop: 4 }} />
      <Marker style={{ marginLeft: 24, fontSize: 44 }}>nuanci</Marker>
    </div>
  );
}

// 화면의 주 버튼처럼 먹색 바탕에 라임 밑단
export function Cta({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignSelf: "flex-start", background: INK, color: LIME, fontSize: 34, padding: "18px 30px", boxShadow: `0 ${CELL + 2}px 0 ${LIME}, 0 ${CELL + 2}px 0 ${CELL}px ${INK}` }}>{children}</div>
  );
}

function Mochi({ scale, style }: { scale: number; style?: CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mochi} width={MOCHI_SIZE.w * scale} height={MOCHI_SIZE.h * scale} alt="" style={style} />;
}

export async function render(children: ReactNode, size: { width: number; height: number } = CARD_SIZE, padding = "52px 64px 60px") {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          padding,
          background: PAPER,
          // 모눈종이 줄
          backgroundImage: `linear-gradient(${RULE} 2px, transparent 2px), linear-gradient(90deg, ${RULE} 2px, transparent 2px)`,
          backgroundSize: "42px 42px",
          fontFamily: "Galmuri",
          color: INK,
        }}
      >
        {children}
      </div>
    ),
    { ...size, fonts: await fonts() },
  );
}

// 메인 주소를 공유했을 때 보이는 카드. 직역 한 줄이 사고로 이어지는 걸 한 장면으로 보여준다
// 카드 그리는 엔진(satori)은 flex: 1 칸의 너비를 글자 줄바꿈에 반영하지 못해서, 칸마다 너비를 정해 둔다
export function homeCard() {
  return render(
    <>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 570 }}>
        <Lockup />
        <div style={{ display: "flex", flexDirection: "column", fontSize: 72, lineHeight: 1.25 }}>
          <div style={{ display: "flex" }}>직역하면</div>
          <div style={{ display: "flex" }}>
            <Marker>사고 나는</Marker>
            <div style={{ display: "flex", marginLeft: 24 }}>순간들</div>
          </div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 28, lineHeight: 1.4, color: SUBTLE }}>골라 보면 상대 속마음이 바로 보여요</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <Cta>가입 없이 1분 →</Cta>
          <Mochi scale={6} style={{ marginLeft: 36, marginBottom: -8 }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 466, marginLeft: 36 }}>
        <div style={{ display: "flex", fontSize: 24, color: SUBTLE }}>하고 싶은 말</div>
        <div style={{ display: "flex", marginTop: 8, fontSize: 36 }}>“오늘은 내가 쏠게!”</div>
        <Block style={{ marginTop: 44, padding: "14px 26px 18px", alignSelf: "flex-start" }}>
          <div style={{ display: "flex", fontFamily: "Pangolin", fontSize: 50 }}>I&apos;ll shoot today!</div>
          <Tail />
          <div style={{ position: "absolute", right: -64, top: -40, display: "flex", transform: "rotate(-8deg)", background: BAD, border: `5px solid ${INK}`, boxShadow: `0 0 0 4px ${CARD}, 0 0 0 9px ${INK}`, padding: "6px 12px 4px", fontSize: 26 }}>사고 발생</div>
        </Block>
        <div style={{ display: "flex", marginTop: 54, fontSize: 24, color: SUBTLE, alignSelf: "flex-end" }}>Alex 속마음</div>
        <Block bg={RULE} style={{ marginTop: 8, padding: "12px 22px", alignSelf: "flex-end", fontSize: 30 }}>
          쏜다고?! 뭘?! 여기서?!
          <Tail bg={RULE} flip />
        </Block>
      </div>
    </>,
  );
}

type SceneCard = { number: number; title: string; partnerName: string; partnerLine: string; intent: string };

// 장면 링크를 공유했을 때 보이는 카드. 상대 대사와 내가 하고 싶은 말까지만 보여주고 답은 감춘다
export function sceneCard({ title, partnerName, partnerLine, intent }: SceneCard) {
  return render(
    <>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 1072 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: 1072 }}>
          <Lockup />
          <div style={{ display: "flex", alignItems: "center", fontSize: 28 }}>
            <div style={{ display: "flex", background: INK, color: LIME, padding: "6px 12px 4px", maxWidth: 640 }}>{title}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 790 }}>
          <div style={{ display: "flex", fontSize: 24, color: SUBTLE }}>{partnerName}</div>
          <Block style={{ marginTop: 8, padding: "12px 26px 16px", alignSelf: "flex-start", maxWidth: 790 }}>
            <div style={{ display: "block", fontFamily: "Pangolin", fontSize: fit(partnerLine, [[26, 52], [40, 44], [999, 36]]), lineHeight: 1.25, lineClamp: 2 }}>{partnerLine}</div>
            <Tail />
          </Block>
          <div style={{ display: "flex", marginTop: 44, fontSize: 24, color: SUBTLE }}>내가 하고 싶은 말</div>
          <div style={{ display: "block", marginTop: 8, fontSize: fit(intent, [[18, 48], [28, 42], [999, 36]]), lineHeight: 1.3, lineClamp: 2, wordBreak: "keep-all" }}>{intent}</div>
        </div>
        <Cta>너라면 뭐라고 할래? →</Cta>
      </div>
      <div style={{ position: "absolute", right: 76, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Block bg={LIME} style={{ padding: "2px 26px 0", fontSize: 68, marginBottom: 30 }}>
          ?
          <Tail bg={LIME} />
        </Block>
        <Mochi scale={12} />
      </div>
    </>,
  );
}
