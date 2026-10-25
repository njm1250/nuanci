export type TrackEvent = {
  type: "scene_viewed" | "choice_selected" | "alternative_viewed" | "scene_completed" | "wrap_viewed" | "next_clicked" | "share_link_copied" | "reward_shown" | "reward_equipped";
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
      body: JSON.stringify({ ...body, ...captureSource(), visitorId: visitorId() }),
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

export function markPlayed() {
  try {
    localStorage.setItem(PLAYED_KEY, "1");
  } catch {}
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
