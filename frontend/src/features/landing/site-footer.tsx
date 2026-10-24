"use client";

import Link from "next/link";
import { useInquiry } from "@/features/inquiry/inquiry-form";

export function SiteFooter() {
  const { open: openInquiry, element } = useInquiry();

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
        <button type="button" onClick={() => openInquiry()} className={linkClass}>
          문의 / 오류 제보
        </button>
      </nav>
      <p className="mt-1 text-center text-[12px] leading-5 tracking-normal text-paper-subtle md:mt-0 md:shrink-0">
        © 2026 nuanci · 이상한 영어를 발견하면 제보해 주세요
      </p>

      {element}
    </footer>
  );
}
