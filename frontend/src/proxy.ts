import { NextResponse, type NextRequest } from "next/server";

// 지표 화면은 관리자 토큰을 비밀번호로 쓰는 기본 인증으로 막는다. 토큰이 없으면 로컬 개발로 보고 열어둔다
export function proxy(request: NextRequest) {
  const token = process.env.NUANCI_ADMIN_TOKEN;
  if (!token) return NextResponse.next();

  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(" ");
  if (scheme === "Basic" && encoded) {
    const password = atob(encoded).split(":").slice(1).join(":");
    if (password === token) return NextResponse.next();
  }
  return new NextResponse("인증이 필요해요", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="nuanci metrics", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/metrics"],
};
