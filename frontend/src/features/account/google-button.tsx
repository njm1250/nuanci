"use client";

import { useState, useSyncExternalStore } from "react";
import { loginUrl } from "./account";
import { useAvatar } from "@/features/avatar/avatar";
import { useCleared } from "@/features/scene/progress";
import { detectInApp, externalUrl, withCarry, type InApp } from "./in-app";

const noop = () => () => {};
let cachedUa = "";
let cachedApp: InApp | null = null;
function inAppSnapshot() {
  if (navigator.userAgent !== cachedUa) {
    cachedUa = navigator.userAgent;
    cachedApp = detectInApp(cachedUa);
  }
  return cachedApp;
}

// 앱 안의 브라우저에서는 구글 로그인이 막히므로 바깥 브라우저로 여는 방법을 대신 보여준다
function OpenOutside({ app }: { app: InApp }) {
  const [copied, setCopied] = useState(false);
  const cleared = useCleared();
  const avatar = useAvatar();
  const target = withCarry(location.href, { cleared, avatar });
  const href = externalUrl(app, target);
  return (
    <div className="mt-4 bg-ink/5 p-3">
      <p className="text-[14px] leading-relaxed text-ink-muted">{app.name} 안에서는 구글 로그인이 막혀 있어요. 브라우저에서 열어 로그인해 주세요.</p>
      {href ? (
        <a href={href} className="blk-btn blk-btn-primary mt-3 block">
          <span className="blk block bg-cta px-3 py-3 text-center font-pixel text-[15px] text-cta-text">브라우저에서 열기</span>
        </a>
      ) : (
        <>
          <p className="mt-2 text-[14px] font-semibold text-ink">오른쪽 위 ··· 버튼 → &lsquo;외부 브라우저로 열기&rsquo;</p>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(target).then(() => setCopied(true), () => {})}
            className="blk-btn mt-3 block w-full"
          >
            <span className="blk block bg-cream px-3 py-3 text-center font-pixel text-[15px] text-ink">{copied ? "복사됨" : "링크 복사"}</span>
          </button>
        </>
      )}
    </div>
  );
}

// 구글 브랜딩 가이드의 밝은 버튼: 흰 바탕, 1px 회색 테두리, 원래 색 그대로의 G 로고. 로고 색과 비율은 바꾸지 않는다
export function GoogleButton({ next, enabled }: { next: string; enabled: boolean }) {
  const inApp = useSyncExternalStore(noop, inAppSnapshot, () => null);
  if (enabled && inApp) return <OpenOutside app={inApp} />;
  if (!enabled) {
    return <p className="mt-4 bg-ink/5 px-3 py-3 text-center font-pixel text-[15px] text-ink-subtle">로그인 준비 중이에요</p>;
  }
  return (
    <a
      href={loginUrl(next)}
      className="mt-4 flex min-h-12 items-center justify-center gap-3 rounded-[4px] border border-[#747775] bg-white px-4 text-[14px] font-medium text-[#1F1F1F] hover:bg-[#f8f8f8]"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      Google로 계속하기
    </a>
  );
}
