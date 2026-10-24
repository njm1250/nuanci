// 카카오톡·인스타그램 같은 앱 안의 브라우저. 구글은 이런 브라우저에서 로그인을 막아서(disallowed_useragent) 바깥 브라우저로 보내야 한다
export type InApp = { name: string; os: "ios" | "android" | "other"; kakao: boolean };

const APPS: [RegExp, string][] = [
  [/KAKAOTALK/i, "카카오톡"],
  [/Instagram/i, "인스타그램"],
  [/FBAN|FBAV|FB_IAB/i, "페이스북"],
  [/\bLine\//i, "라인"],
  [/NAVER\(inapp/i, "네이버"],
  [/everytimeApp/i, "에브리타임"],
  [/DaumApps/i, "다음"],
];

export function detectInApp(ua: string): InApp | null {
  const os = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "other";
  const hit = APPS.find(([re]) => re.test(ua));
  if (hit) return { name: hit[1], os, kakao: hit[1] === "카카오톡" };
  // 이름을 모르는 안드로이드 앱 내 브라우저(WebView)
  if (os === "android" && /; wv\)/.test(ua)) return { name: "앱", os, kakao: false };
  return null;
}

// 바깥 브라우저로 바로 여는 주소. 카카오톡은 자체 주소로, 안드로이드는 크롬으로 연다. 아이폰의 다른 앱은 방법이 없어서 null
export function externalUrl(app: InApp, url: string) {
  if (app.kakao) return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  if (app.os === "android") {
    const u = new URL(url);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  }
  return null;
}

// 앱 안의 브라우저와 바깥 브라우저는 저장소가 따로라서, 바깥으로 넘어갈 때 해 본 장면과 꾸민 모습을 주소에 실어 보낸다
export const CARRY_PARAM = "carry";

export function withCarry(url: string, carry: { cleared: string[]; avatar: unknown }) {
  const u = new URL(url);
  u.searchParams.set(CARRY_PARAM, JSON.stringify({ c: carry.cleared, a: carry.avatar }));
  return u.toString();
}
