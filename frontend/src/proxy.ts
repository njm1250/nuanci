import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/features/admin/cookie";
import { CLOSED_PATHS } from "@/features/site/lean";
import { RETURNING_COOKIE } from "@/features/scene/track";

// 검색·링크 미리보기 봇은 소개 화면을 그대로 읽게 둔다
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|yeti|daum|embedly|lighthouse/i;

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 관리자 화면은 로그인 쿠키가 없으면 로그인 화면으로 보낸다. 쿠키가 유효한지는 BE가 다시 확인한다
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || request.cookies.has(ADMIN_COOKIE)) return NextResponse.next();
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // 입구를 닫아 둔 기능(site/lean.ts)의 주소로 오면 홈으로 보낸다. 코드는 그대로라 켜면 다시 열린다
  if (CLOSED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.redirect(new URL("/", request.url));

  // 처음 온 사람은 홈 주소에서 소개 화면 대신 첫 장면을 바로 본다. 주소는 /로 남는다. 소개(/?intro)와 봇은 원래 홈을 본다
  if (pathname === "/" && !searchParams.has("intro") && !request.cookies.has(RETURNING_COOKIE) && !BOT.test(request.headers.get("user-agent") ?? "")) {
    return NextResponse.rewrite(new URL("/start", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/test/:path*", "/test", "/me/room"],
};
