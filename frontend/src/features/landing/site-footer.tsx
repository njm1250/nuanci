"use client";

import Link from "next/link";
import { useInquiry } from "@/features/inquiry/inquiry-form";

export function SiteFooter() {
  const { open: openInquiry, element } = useInquiry();

  const linkClass = "inline-flex min-h-11 items-center px-2 text-[14px] transition-colors hover:text-gold";

  return (
    <footer className="mx-4 mt-auto pb-6 md:mx-0 md:mt-6 md:pb-0">
      {/* 제보는 법적 안내 사이에 묻히지 않게, 눌러서 바로 여는 띠로 따로 둔다. 아직 영어를 안 본 첫 방문자에게는 이른 질문이라 장면을 해 본 사람에게만 보인다 */}
      <button type="button" onClick={() => openInquiry("scene")} className="blk-btn mb-3 hidden w-full text-left returning:block">
        <span className="blk flex items-center justify-between gap-3 bg-slate-block px-4 py-3 text-paper">
          <span>
            <span className="block text-[16px] font-semibold">이상한 영어를 발견했나요?</span>
            <span className="mt-0.5 block text-[12px] text-paper-subtle">알려 주시면 바로 고칠게요</span>
          </span>
          <span className="shrink-0 font-pixel text-[15px] text-gold">알려 주기 ›</span>
        </span>
      </button>
      <div className="border-t border-slate-block pt-3 md:flex md:items-center md:justify-between md:gap-4 md:pt-4">
      <nav aria-label="서비스 안내" className="flex flex-wrap items-center justify-center text-paper-subtle md:-ml-2 md:justify-start">
        <Link href="/?intro" className={linkClass}>
          nuanci 소개
        </Link>
        <span aria-hidden="true" className="text-paper-subtle">·</span>
        <Link href="/terms" className={linkClass}>
          이용약관
        </Link>
        <span aria-hidden="true" className="text-paper-subtle">·</span>
        <Link href="/privacy" className={`${linkClass} font-semibold text-paper-muted`}>
          개인정보처리방침
        </Link>
        <span aria-hidden="true" className="text-paper-subtle">·</span>
        <button type="button" onClick={() => openInquiry()} className={linkClass}>
          문의 / 오류 제보
        </button>
      </nav>
      <p className="mt-1 text-center text-[12px] leading-5 tracking-normal text-paper-subtle md:mt-0 md:shrink-0">© 2026 nuanci</p>
      </div>

      {element}
    </footer>
  );
}
