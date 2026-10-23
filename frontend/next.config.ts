import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
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
