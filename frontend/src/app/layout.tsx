import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { AccountSync } from "@/features/account/account-sync";
import { NavTracker } from "@/features/collection/back-button";
import { ErrorReporter } from "@/features/monitor/error-reporter";
import "./fonts/galmuri.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://nuanci.vercel.app"),
  title: "nuanci",
  description: "직역하면 사고 나는 순간들. 황당한 상황 속 그 한마디를 영어권 감성에 딱 맞게 골라 보세요.",
};

const RETURNING_SCRIPT = `try{var c=localStorage.getItem("nuanci.cleared");if(localStorage.getItem("nuanci.played")==="1"||(c&&c!=="[]"))document.documentElement.setAttribute("data-returning","")}catch(e){}`;

export const viewport: Viewport = {
  themeColor: "#0f0e12",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* 첫 화면을 그리기 전에 다시 온 방문자인지 표시해서, 재방문 홈 배치로 바뀔 때 화면이 깜빡이지 않게 한다 */}
        <script dangerouslySetInnerHTML={{ __html: RETURNING_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        <AccountSync />
        <NavTracker />
        <ErrorReporter />
      </body>
    </html>
  );
}
