"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export const notices = {
  terms: {
    title: "이용약관",
    description: "서비스 이용약관을 준비하고 있어요. 준비가 끝나면 이곳에서 확인할 수 있어요.",
  },
  privacy: {
    title: "개인정보처리방침",
    description: "개인정보처리방침을 준비하고 있어요. 준비가 끝나면 수집하는 정보와 이용 목적, 보관 기간을 이곳에서 안내할게요.",
  },
  contact: {
    title: "문의 / 오류 제보",
    description: "문의 창구를 준비하고 있어요. 이용 중 불편한 점이나 영어 표현에 관한 의견을 보낼 수 있도록 곧 안내할게요.",
  },
};

export type Notice = keyof typeof notices;

// 이용약관·개인정보처리방침·문의 안내창. 푸터와 내 정보 화면이 같이 쓴다
export function useNotice() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState<Notice>("terms");
  const open = (value: Notice) => {
    setNotice(value);
    dialog.current?.showModal();
  };
  return { open, element: <NoticeDialog dialog={dialog} notice={notice} /> };
}

function NoticeDialog({ dialog, notice }: { dialog: React.RefObject<HTMLDialogElement | null>; notice: Notice }) {
  return (
    <dialog
      ref={dialog}
      aria-labelledby="site-notice-title"
      aria-describedby="site-notice-description"
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[400px] overflow-visible bg-transparent p-0 text-ink backdrop:bg-night-deep/80"
    >
      <div className="blk-frame">
        <div className="blk bg-paper p-5">
          <p className="font-pixel text-[15px] text-ink-subtle">nuanci</p>
          <h2 id="site-notice-title" className="mt-2 font-pixel-title text-[24px] leading-[1.25]">
            {notices[notice].title}
          </h2>
          <p id="site-notice-description" className="mt-3 text-[14px] leading-relaxed text-ink-muted">
            {notices[notice].description}
          </p>
          <button type="button" onClick={() => dialog.current?.close()} className="blk-btn mt-5 block w-full">
            <span className="blk block bg-cream px-3 py-3 text-center font-pixel text-[15px] text-ink">닫기</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function contactHref(contactEmail: string) {
  return `mailto:${contactEmail}?subject=${encodeURIComponent("[nuanci] 문의 / 오류 제보")}`;
}

export function SiteFooter({ contactEmail }: { contactEmail?: string }) {
  const { open: openNotice, element } = useNotice();

  const linkClass = "inline-flex min-h-11 items-center px-2 text-[13px] transition-colors hover:text-gold";

  return (
    <footer className="mx-4 mt-auto border-t border-slate-block pb-6 pt-3 md:mx-0 md:mt-6 md:flex md:items-center md:justify-between md:gap-4 md:pb-0 md:pt-4">
      <nav aria-label="서비스 안내" className="flex flex-wrap items-center justify-center text-paper-subtle md:-ml-2 md:justify-start">
        <Link href="/terms" className={linkClass}>
          이용약관
        </Link>
        <span aria-hidden="true" className="text-paper-subtle">·</span>
        <Link href="/privacy" className={`${linkClass} font-semibold text-paper-muted`}>
          개인정보처리방침
        </Link>
        <span aria-hidden="true" className="text-paper-subtle">·</span>
        {contactEmail ? (
          <a href={contactHref(contactEmail)} className={linkClass}>
            문의 / 오류 제보
          </a>
        ) : (
          <button type="button" onClick={() => openNotice("contact")} className={linkClass}>
            문의 / 오류 제보
          </button>
        )}
      </nav>
      <p className="mt-1 text-center text-[12px] leading-5 tracking-normal text-paper-subtle md:mt-0 md:shrink-0">
        © 2026 nuanci. All rights reserved.
      </p>

      {element}
    </footer>
  );
}
