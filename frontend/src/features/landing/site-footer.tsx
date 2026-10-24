"use client";

import { useRef, useState } from "react";

const notices = {
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

type Notice = keyof typeof notices;

export function SiteFooter({ contactEmail }: { contactEmail?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState<Notice>("terms");

  function openNotice(value: Notice) {
    setNotice(value);
    dialog.current?.showModal();
  }

  const linkClass = "inline-flex min-h-11 items-center rounded-sm px-2 text-[13px] transition-colors hover:text-gold";

  return (
    <footer className="mx-4 mt-auto border-t border-slate-block pb-6 pt-3 md:mx-0 md:mt-6 md:flex md:items-center md:justify-between md:gap-4 md:pb-0 md:pt-4">
      <nav aria-label="서비스 안내" className="flex flex-wrap items-center justify-center text-paper-subtle md:-ml-2 md:justify-start">
        <button type="button" onClick={() => openNotice("terms")} className={linkClass}>
          이용약관
        </button>
        <span aria-hidden="true" className="text-paper-subtle">·</span>
        <button type="button" onClick={() => openNotice("privacy")} className={`${linkClass} font-semibold text-paper-muted`}>
          개인정보처리방침
        </button>
        <span aria-hidden="true" className="text-paper-subtle">·</span>
        {contactEmail ? (
          <a href={`mailto:${contactEmail}?subject=${encodeURIComponent("[nuanci] 문의 / 오류 제보")}`} className={linkClass}>
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

      <dialog
        ref={dialog}
        aria-labelledby="site-notice-title"
        aria-describedby="site-notice-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[400px] overflow-y-auto border-2 border-slate-block bg-night p-0 text-paper shadow-2xl backdrop:bg-night-deep/80"
      >
        <div className="p-6">
          <p className="font-pixel text-[15px] text-gold">nuanci</p>
          <h2 id="site-notice-title" className="mt-4 text-[20px] font-semibold tracking-tight">{notices[notice].title}</h2>
          <p id="site-notice-description" className="mt-3 text-[14px] leading-7 text-paper-muted">{notices[notice].description}</p>
          <button type="button" onClick={() => dialog.current?.close()} className="mt-6 flex min-h-11 w-full items-center justify-center border border-slate-block bg-slate-block px-4 text-[14px] font-semibold transition-colors hover:bg-paper hover:text-ink">
            닫기
          </button>
        </div>
      </dialog>
    </footer>
  );
}
