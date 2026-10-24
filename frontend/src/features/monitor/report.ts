import { visitorId } from "@/features/scene/track";

// 브라우저 확장 프로그램이나 브라우저 자체에서 나는, 우리가 고칠 수 없는 오류
const NOISE = [/ResizeObserver loop/i, /chrome-extension:\/\//i, /moz-extension:\/\//i, /Script error\.?$/i];
const sent = new Set<string>();

// 화면에서 난 오류를 서버에 남긴다. 같은 오류는 한 번만 보내고, 실패해도 화면에는 영향을 주지 않는다
export function reportError(message: string, stack?: string) {
  const text = message.trim();
  if (!text || NOISE.some((r) => r.test(text) || (stack && r.test(stack)))) return;
  const key = `${text}|${location.pathname}`;
  if (sent.has(key)) return;
  sent.add(key);
  try {
    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, stack, url: location.href, visitorId: visitorId() }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
