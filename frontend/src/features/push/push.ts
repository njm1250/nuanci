import { visitorId } from "@/features/scene/track";

// 웹 푸시 구독. 서버 키를 받고, 서비스 워커를 등록하고, 브라우저에 허락을 받은 뒤 구독 정보와 고른 시각을 서버에 남긴다
const HOUR_KEY = "nuanci.pushHour";
const DISMISS_KEY = "nuanci.pushDismissed";

export type PushSupport = "ok" | "ios-install" | "none";

// 아이폰 사파리는 홈 화면에 추가한 웹앱에서만 알림을 받는다. 탭에서 연 경우는 추가하는 법을 안내한다
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "none";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return Notification.permission === "denied" ? "none" : "ok";
  return ios && !standalone ? "ios-install" : "none";
}

export function savedHour(): number | null {
  try {
    const v = localStorage.getItem(HOUR_KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

export function dismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {}
}

function keyBytes(base64url: string) {
  const s = atob(base64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64url.length / 4) * 4, "="));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function serverKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/key");
    return res.ok ? ((await res.json()).publicKey ?? null) : null;
  } catch {
    return null;
  }
}

export async function subscribe(hour: number): Promise<"ok" | "denied" | "failed"> {
  const key = await serverKey();
  if (!key) return "failed";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
    const json = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: visitorId(), endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, hour }),
    });
    if (!res.ok) return "failed";
    localStorage.setItem(HOUR_KEY, String(hour));
    return "ok";
  } catch {
    return "failed";
  }
}

export async function unsubscribe() {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
  } catch {}
  try {
    localStorage.removeItem(HOUR_KEY);
  } catch {}
}
