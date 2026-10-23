import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { pixel, pixelTitle } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "nuanci",
  description: "하고 싶은 말을, 전하고 싶은 느낌으로.",
};

export const viewport: Viewport = {
  themeColor: "#1f2633",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pixel.variable} ${pixelTitle.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
