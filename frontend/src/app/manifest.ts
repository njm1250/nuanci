import type { MetadataRoute } from "next";

// 홈 화면에 추가했을 때의 앱 정보. 아이폰은 홈 화면에 추가한 웹앱에서만 알림을 받을 수 있어서 standalone으로 연다
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "nuanci",
    short_name: "nuanci",
    description: "하고 싶은 말을 영어로 골라 보면, 상대가 어떻게 알아듣는지 보여 주는 게임",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#09318d",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
