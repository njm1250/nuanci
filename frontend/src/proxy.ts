import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/features/admin/cookie";

// 관리자 화면은 로그인 쿠키가 없으면 로그인 화면으로 보낸다. 쿠키가 유효한지는 BE가 다시 확인한다
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (request.cookies.has(ADMIN_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};
