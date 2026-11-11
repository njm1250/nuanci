import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { AccountSync } from "@/features/account/account-sync";
import { NavTracker } from "@/features/collection/back-button";
import { ErrorReporter } from "@/features/monitor/error-reporter";
import { SourceCapture } from "@/features/site/source-capture";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/features/site/metadata";
import { THEME_COLORS, THEME_SCRIPT } from "@/features/theme/theme-script";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: { siteName: "nuanci", locale: "ko_KR", type: "website", title: SITE_TITLE, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image" },
};

const RETURNING_SCRIPT = `try{var c=localStorage.getItem("nuanci.cleared");if(location.search.indexOf("intro")<0&&(localStorage.getItem("nuanci.played")==="1"||(c&&c!=="[]"))){document.documentElement.setAttribute("data-returning","");document.cookie="nuanci_r=1; path=/; max-age=31536000; samesite=lax"}}catch(e){}`;

export const viewport: Viewport = {
  themeColor: THEME_COLORS.light,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full antialiased ${fontVariables}`} suppressHydrationWarning>
      <head>
        {/* 첫 화면을 그리기 전에 다시 온 방문자인지 표시해서, 재방문 홈 배치로 바뀔 때 화면이 깜빡이지 않게 한다 */}
        <script dangerouslySetInnerHTML={{ __html: RETURNING_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        <AccountSync />
        <Suspense fallback={null}>
          <NavTracker />
        </Suspense>
        <ErrorReporter />
        <SourceCapture />
      </body>
    </html>
  );
}
