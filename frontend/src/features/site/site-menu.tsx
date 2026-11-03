"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ITEMS = [
  { href: "/scenes", title: "전체 장면", note: "오늘은 또 무슨 사고?", desc: "순서대로 · 상황별로 고르기" },
  { href: "/expressions", title: "표현 모음", note: "이 말, 써먹어야지", desc: "해 본 장면의 표현 복습" },
  { href: "/test", title: "유형 테스트", note: "넌 무슨 유형이려나", desc: "내 영어 사고 유형 찾기" },
  { href: "/me/room", title: "아지트", note: "내 방도 꾸며야지", desc: "옷 입히기 · 방 꾸미기" },
  { href: "/me", title: "내 정보", note: "오늘도 출근 완료", desc: "사원증 · 연속 기록 · 설정" },
];

// 전체 메뉴. 메뉴 이름은 항상 또렷하게 두고, 마우스나 키보드로 다가갔을 때만 옆에 적어 둔 듯한 한마디가 나타난다. 호버가 없는 터치 화면에서는 첫 줄의 한마디만 보여 준다
function MenuDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog ref={ref} onClose={onClose} aria-label="메뉴" className="m-0 h-dvh max-h-none w-screen max-w-none animate-[fade-in_160ms] overflow-y-auto bg-slate-block text-paper break-keep">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-10 md:px-8">
        <div className="flex h-14 items-center justify-end md:h-16">
          <button type="button" onClick={() => ref.current?.close()} className="flex h-11 items-center px-1 font-pixel text-[15px]">
            닫기
          </button>
        </div>
        <ol className="space-y-5 md:space-y-8">
          {ITEMS.map((item, i) => (
            <li key={item.href}>
              <Link href={item.href} onClick={() => ref.current?.close()} className="menu-row grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 md:gap-x-8">
                <span aria-hidden className="font-poster text-[52px] leading-none md:text-[88px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="flex items-end justify-end gap-2 border-b border-paper pb-1.5 md:gap-3 md:pb-2">
                    <span aria-hidden className={`menu-note flex min-w-0 items-end gap-1 font-scrawl text-[24px] leading-none text-rust-light md:text-[42px] ${i === 0 ? "menu-note-touch" : ""}`}>
                      <span className="truncate pb-0.5">{item.note}</span>
                      <svg width="34" height="16" viewBox="0 0 34 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="mb-1 hidden shrink-0 md:block">
                        <path d="M2 4c6 9 17 10 29 5M25 3l6 6-8 4" />
                      </svg>
                    </span>
                    <span className="shrink-0 font-poster text-[28px] leading-none md:text-[52px]">{item.title}</span>
                  </span>
                  <span className="mt-1.5 block text-right text-[14px] text-paper-muted md:text-[18px]">{item.desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </dialog>
  );
}

export function SiteMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className="flex h-11 shrink-0 items-center gap-2 pl-2 font-pixel text-[15px] text-paper-muted hover:text-paper">
        <span aria-hidden className="block h-2 w-5 border-y-2 border-current" />
        메뉴
      </button>
      {open && createPortal(<MenuDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
