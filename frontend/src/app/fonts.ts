import localFont from "next/font/local";
import { splitFonts } from "./font-faces";

// 글꼴 파일은 scripts/subset-fonts.py로 만든다. 실제로 쓰는 글자만 담았고, 빠진 글자는 Pretendard 조각 CSS가 대신 보여 준다.
// 본문(Pretendard)·제목(던파 비트비트체 v2, NEOPLE. 도트로 쌓은 굵은 글자라 무대의 픽셀 캐릭터와 같은 세계로 이어진다)·무대 말풍선(Galmuri14)은
// 첫 화면 글자와 나머지 글자 두 파일로 나눠 font-faces.ts에 있다. 본문 첫 파일만 HTML과 함께 미리 받는다
const pangolin = localFont({ src: "./fonts/pangolin-line.woff2", weight: "400", display: "swap", variable: "--font-pangolin", preload: false, adjustFontFallback: false });
const scrawl = localFont({ src: "./fonts/scrawl.woff2", weight: "400", display: "swap", variable: "--font-nanum-pen", preload: false, adjustFontFallback: false });

export const fontVariables = [...splitFonts, pangolin, scrawl].map((f) => f.variable).join(" ");
