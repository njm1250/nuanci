import type { NextConfig } from "next";

const SHARE_FONTS = ["./node_modules/galmuri/dist/Galmuri11-Bold.ttf", "./node_modules/@fontsource/pangolin/files/pangolin-latin-400-normal.woff"];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 같은 와이파이의 휴대폰에서 개발 서버에 접속할 수 있게 사설망 주소를 허용한다
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // 개발 모드 배지가 화면 하단 버튼을 가려서 끈다
  devIndicators: false,
  // 예전 주소와 www로 들어오면 대표 주소로 보낸다. 이미 공유된 링크도 그대로 열린다
  async redirects() {
    return ["nuanci.vercel.app", "www.nuanci.app"].map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://nuanci.app/:path*",
      permanent: true,
    }));
  },
  // /api 요청을 BE로 프록시해서 브라우저 입장에서는 같은 출처로 보이게 한다 (CORS 불필요)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/:path*`,
      },
    ];
  },
  partialPrefetching: true,
  // 공유 카드 이미지가 런타임에 읽는 글꼴을 배포 묶음에 넣는다
  outputFileTracingIncludes: {
    "/opengraph-image": SHARE_FONTS,
    "/scenes/[number]/opengraph-image": SHARE_FONTS,
    "/test/opengraph-image": SHARE_FONTS,
    "/test/r/[type]/opengraph-image": SHARE_FONTS,
    "/test/r/[type]/story": SHARE_FONTS,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
