import localFont from "next/font/local";

// 글꼴 파일은 scripts/subset-fonts.py로 만든다. 실제로 쓰는 글자만 담았고, 빠진 글자는 Pretendard 조각 CSS가 대신 보여 준다.
// 본문은 모든 화면 첫 줄에 쓰여서 HTML과 함께 미리 받고, 나머지는 그 글꼴이 나오는 화면에서만 받는다
const text = localFont({ src: "./fonts/text.woff2", weight: "400 800", display: "swap", variable: "--font-text" });
const pangolin = localFont({ src: "./fonts/pangolin-line.woff2", weight: "400", display: "swap", variable: "--font-pangolin", preload: false, adjustFontFallback: false });
const poster = localFont({ src: "./fonts/poster.woff2", weight: "400", display: "swap", variable: "--font-black-han-sans", preload: false, adjustFontFallback: false });
const scrawl = localFont({ src: "./fonts/scrawl.woff2", weight: "400", display: "swap", variable: "--font-nanum-pen", preload: false, adjustFontFallback: false });

// 무대 말풍선에만 쓰는 픽셀 글꼴. 무대가 있는 화면에서만 받는다
const stage = localFont({ src: "../../node_modules/galmuri/dist/Galmuri14.woff2", weight: "400", display: "swap", variable: "--font-galmuri", preload: false, adjustFontFallback: false });

export const fontVariables = [text, pangolin, poster, scrawl, stage].map((f) => f.variable).join(" ");
