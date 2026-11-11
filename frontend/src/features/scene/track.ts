export type TrackEvent = {
  type: "scene_viewed" | "lead_finished" | "choice_selected" | "alternative_viewed" | "scene_completed" | "wrap_viewed" | "next_clicked" | "share_link_copied" | "reward_shown" | "reward_equipped";
  sceneId: string;
  sceneVersion: number;
  attemptId: string;
  step?: "base" | "followUp";
  choiceId?: string;
  entry?: "home" | "next" | "share" | "direct";
};

const VISITOR_KEY = "nuanci.visitor";
const ENTRY_KEY = "nuanci.entry";
const PLAYED_KEY = "nuanci.played";
export const SHARE_PARAM = "s";
// 홈에서 보기를 바로 고르고 들어올 때 고른 보기 id를 싣는 주소 꼬리표
export const PICK_PARAM = "pick";
// 공유 링크로 연 장면이면 링크 주인의 공유 코드를 남겨 둔다. 그 장면을 끝낼 때 보상 서버에 함께 보낸다
export const VIA_KEY = "nuanci.via";
let fallbackVisitor: string | null = null;

// 같은 와이파이의 http 주소에서도 동작하도록 crypto.randomUUID 대신 직접 만든다
export function uuid() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function visitorId() {
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved) return saved;
    const created = uuid();
    localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    fallbackVisitor ??= uuid();
    return fallbackVisitor;
  }
}

// 처음 들어온 경로. utm 꼬리표가 있으면 그것을, 없으면 다른 사이트에서 넘어왔을 때 그 주소를 한 번만 저장한다
type Source = { utmSource?: string; utmMedium?: string; utmCampaign?: string; referrer?: string };
const SOURCE_KEY = "nuanci.source";
// 우리 도메인끼리 오가거나 구글 로그인에서 돌아온 건 들어온 경로가 아니다
const OWN_REFERRER = /(^|\.)nuanci\.app$|^accounts\.google\./;
let source: Source | null = null;

function clip(value: string | null) {
  const v = value?.trim().toLowerCase().slice(0, 100);
  return v || undefined;
}

export function captureSource(): Source {
  if (source) return source;
  try {
    const saved = localStorage.getItem(SOURCE_KEY);
    if (saved) return (source = JSON.parse(saved) as Source);
  } catch {}
  const params = new URLSearchParams(location.search);
  let referrer: string | undefined;
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    if (host && host !== location.hostname && !OWN_REFERRER.test(host)) referrer = host.replace(/^www\./, "");
  } catch {}
  const found: Source = { utmSource: clip(params.get("utm_source")), utmMedium: clip(params.get("utm_medium")), utmCampaign: clip(params.get("utm_campaign")), referrer };
  // 출처가 없는 방문은 저장하지 않아서, 다음에 꼬리표 달린 링크로 오면 그때 채널이 잡힌다
  if (!found.utmSource && !found.referrer) return {};
  source = found;
  try {
    localStorage.setItem(SOURCE_KEY, JSON.stringify(found));
  } catch {}
  return found;
}

// 이용 이벤트를 보낸다. 로그인 상태는 서버에서 쿠키로 확인한다. 실패해도 화면 진행을 막지 않는다
export function sendEvent(body: Record<string, unknown>) {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 자동화 도구로 움직이는 브라우저(navigator.webdriver)는 서버가 봇으로 나눠 지표에서 뺀다
      body: JSON.stringify({ ...body, ...captureSource(), visitorId: visitorId(), automated: navigator.webdriver === true }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function track(event: TrackEvent) {
  sendEvent(event);
}

// 홈 방문은 장면과 상관없어서 방문자 id만 보낸다
export function trackHome() {
  sendEvent({ type: "home_viewed" });
}

// 화면을 처음 누르거나 스크롤하는 순간 한 번 알린다. 사람이 보고 나간 방문과, 열리기만 하고 아무 반응이 없는 방문(봇·미리보기일 수 있음)을 나눠 보려는 것이다.
// 정리 함수를 돌려주어 effect에서 쓴다
const ENGAGE_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
export function watchEngagement(extra: Record<string, unknown> = {}) {
  const stop = () => ENGAGE_EVENTS.forEach((t) => window.removeEventListener(t, once, true));
  const once = () => {
    stop();
    sendEvent({ type: "page_engaged", ...extra });
  };
  ENGAGE_EVENTS.forEach((t) => window.addEventListener(t, once, { capture: true, passive: true }));
  return stop;
}

// 다시 온 사람인지 서버(proxy.ts)가 알 수 있게 남기는 쿠키. 이게 없으면 홈 주소에서 소개 화면 대신 첫 장면을 바로 보여 준다
export const RETURNING_COOKIE = "nuanci_r";

export function markPlayed() {
  try {
    localStorage.setItem(PLAYED_KEY, "1");
  } catch {}
  document.cookie = `${RETURNING_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
  // layout의 인라인 스크립트는 새로고침할 때만 도니, 로고를 눌러 돌아와도 데모가 숨게 바로 붙인다
  document.documentElement.setAttribute("data-returning", "");
}

export function hasPlayed() {
  try {
    return localStorage.getItem(PLAYED_KEY) === "1";
  } catch {
    return false;
  }
}

// 앱 안에서 장면으로 넘어갈 때는 유입 경로를 주소 대신 세션에 남긴다
export function markEntry(entry: "home" | "next") {
  try {
    sessionStorage.setItem(ENTRY_KEY, entry);
  } catch {}
}

// 장면을 연 경로를 한 번만 읽는다. 공유 링크 표시는 읽은 뒤 주소창에서 지운다
export function takeEntry(): TrackEvent["entry"] {
  const url = new URL(location.href);
  const code = url.searchParams.get(SHARE_PARAM);
  try {
    if (code && code !== "1") sessionStorage.setItem(VIA_KEY, code.slice(0, 12));
    else sessionStorage.removeItem(VIA_KEY);
  } catch {}
  if (code !== null) {
    url.searchParams.delete(SHARE_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    return "share";
  }
  try {
    const saved = sessionStorage.getItem(ENTRY_KEY);
    sessionStorage.removeItem(ENTRY_KEY);
    if (saved === "home" || saved === "next") return saved;
  } catch {}
  return "direct";
}
