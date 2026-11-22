import type { MetadataRoute } from "next";

// 홈 화면에 추가했을 때와 플레이 스토어 안드로이드 앱(TWA)의 앱 정보.
// 아이폰은 홈 화면에 추가한 웹앱에서만 알림을 받을 수 있어서 standalone으로 연다. 안드로이드 앱 아이콘·스플래시는 512 아이콘에서 만든다
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "nuanci - 1분 영어 회화 게임",
    short_name: "nuanci",
    description: "하고 싶은 말을 영어로 골라 보면, 상대가 어떻게 알아듣는지 보여 주는 게임",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#09318d",
    categories: ["education", "games"],
    icons: [
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
