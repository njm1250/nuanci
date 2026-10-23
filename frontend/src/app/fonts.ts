import localFont from "next/font/local";

export const pixel = localFont({
  src: "../../node_modules/galmuri/dist/Galmuri14.woff2",
  weight: "400",
  variable: "--font-galmuri",
  preload: false,
});

export const pixelTitle = localFont({
  src: "../../node_modules/galmuri/dist/Galmuri11-Bold.woff2",
  weight: "700",
  variable: "--font-galmuri-title",
  preload: false,
});
