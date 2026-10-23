import { Gowun_Batang, IBM_Plex_Sans_KR } from "next/font/google";
import localFont from "next/font/local";

export const plex = IBM_Plex_Sans_KR({
  weight: ["400", "600"],
  subsets: ["latin"],
  preload: false,
});

export const batang = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  preload: false,
});

export const pixelBody = localFont({
  src: "../../../node_modules/galmuri/dist/Galmuri14.woff2",
  weight: "400",
  preload: false,
});

export const pixelTitle = localFont({
  src: "../../../node_modules/galmuri/dist/Galmuri11-Bold.woff2",
  weight: "700",
  preload: false,
});

