export type TrackEvent = {
  type: "scene_viewed" | "choice_selected" | "alternative_viewed" | "scene_completed" | "wrap_viewed" | "next_clicked" | "share_link_copied";
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

// 익명 이용 이벤트를 보낸다. 실패해도 장면 진행을 막지 않는다
export function track(event: TrackEvent) {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...event, visitorId: visitorId() }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

// 홈 방문은 장면과 상관없어서 방문자 id만 보낸다
export function trackHome() {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "home_viewed", visitorId: visitorId() }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
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
  if (url.searchParams.has(SHARE_PARAM)) {
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
