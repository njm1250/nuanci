import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 같은 와이파이의 휴대폰에서 개발 서버에 접속할 수 있게 사설망 주소를 허용한다
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // 개발 모드 배지가 화면 하단 버튼을 가려서 끈다
  devIndicators: false,
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
