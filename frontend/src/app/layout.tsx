import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { AccountSync } from "@/features/account/account-sync";
import "./fonts/galmuri.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://nuanci.vercel.app"),
  title: "nuanci",
  description: "직역하면 사고 나는 순간들. 황당한 상황 속 그 한마디를 영어권 감성에 딱 맞게 골라 보세요.",
};

export const viewport: Viewport = {
  themeColor: "#0f0e12",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <AccountSync />
      </body>
    </html>
  );
}
