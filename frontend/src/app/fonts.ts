import { Black_Han_Sans, Nanum_Pen_Script } from "next/font/google";
import localFont from "next/font/local";

// 글꼴 파일은 scripts/subset-fonts.py로 만든다.
// 픽셀 글꼴의 흔한 글자 묶음(core)은 모든 화면 첫 줄(로고·제목)에 쓰여서 HTML과 함께 미리 받는다.
// 나머지 글자 묶음(rest)은 core에 없는 글자가 나올 때만 받고, 영어 대사 글꼴은 대사가 나오는 화면에서만 받는다.
// 픽셀 글꼴은 다른 글꼴로 크기를 맞춰도 모양이 달라서 대체 글꼴 크기 보정은 쓰지 않는다
export const galmuri14 = localFont({ src: "./fonts/galmuri14-core.woff2", weight: "400", display: "swap", variable: "--font-galmuri14", adjustFontFallback: false });
export const galmuri14Rest = localFont({ src: "./fonts/galmuri14-rest.woff2", weight: "400", display: "swap", variable: "--font-galmuri14-rest", preload: false, adjustFontFallback: false });
export const galmuri11Bold = localFont({ src: "./fonts/galmuri11-bold-core.woff2", weight: "700", display: "swap", variable: "--font-galmuri11-bold", adjustFontFallback: false });
export const galmuri11BoldRest = localFont({ src: "./fonts/galmuri11-bold-rest.woff2", weight: "700", display: "swap", variable: "--font-galmuri11-bold-rest", preload: false, adjustFontFallback: false });
export const pangolin = localFont({ src: "./fonts/pangolin-line.woff2", weight: "400", display: "swap", variable: "--font-pangolin", preload: false, adjustFontFallback: false });

// 큰 제목과 결과 같은 순간에만 쓰는 포스터 글꼴과 낙서 글꼴. 본문이 먼저 뜨도록 미리 받지 않는다
export const blackHanSans = Black_Han_Sans({ weight: "400", display: "swap", variable: "--font-black-han-sans", preload: false });
export const nanumPen = Nanum_Pen_Script({ weight: "400", display: "swap", variable: "--font-nanum-pen", preload: false });

export const fontVariables = [galmuri14, galmuri14Rest, galmuri11Bold, galmuri11BoldRest, pangolin, blackHanSans, nanumPen].map((f) => f.variable).join(" ");
