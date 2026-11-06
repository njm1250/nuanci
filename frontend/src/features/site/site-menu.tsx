"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mascot } from "@/features/mascot/mascot";

const ASK = "어디로 갈까?";
const ITEMS = [
  { href: "/scenes", title: "전체 장면", desc: "순서대로 · 상황별로 고르기", reply: "오늘은 또 무슨 사고 치게?" },
  { href: "/expressions", title: "표현 모음", desc: "해 본 장면의 표현 복습", reply: "그 말, 이번엔 써먹어 봐" },
  { href: "/test", title: "유형 테스트", desc: "내 영어 사고 유형 찾기", reply: "넌 무슨 유형이려나~" },
  { href: "/me/room", title: "아지트", desc: "옷 입히기 · 방 꾸미기", reply: "내 자리도 하나 만들어 줘" },
  { href: "/me", title: "내 정보", desc: "사원증 · 연속 기록 · 설정", reply: "오늘도 출근 도장 찍자" },
];

// 전체 메뉴. 장면처럼 Mochi가 묻고 선택지를 고르게 해서, 다가가면 말풍선이 반응한다. 말풍선은 없어도 되는 재미라 메뉴 이름과 설명만으로 쓸 수 있게 한다
function MenuDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [near, setNear] = useState<number | null>(null);
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
  const close = () => ref.current?.close();
  // 장면의 선택지처럼 숫자 키로도 고른다
  const onKeyDown = (e: React.KeyboardEvent) => {
    const item = ITEMS[Number(e.key) - 1];
    if (!item || e.metaKey || e.ctrlKey || e.altKey) return;
    close();
    router.push(item.href);
  };
  const reply = near === null ? ASK : ITEMS[near].reply;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(e) => e.target === ref.current && close()}
      aria-label="메뉴"
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-[440px] animate-[fade-in_160ms] overflow-y-auto bg-night text-paper break-keep backdrop:bg-[#141317]/50"
    >
      <div className="flex h-14 items-center justify-end px-4 md:h-16">
        <button type="button" onClick={close} className="flex h-11 items-center px-1 font-pixel text-[15px] text-paper-muted hover:text-paper">
          닫기
        </button>
      </div>

      <div aria-hidden className="flex items-end gap-3 border-b-4 border-[#5e5a54] px-4">
        <Mascot scale={3} className="shrink-0" />
        <div className="blk-frame-sm mb-5 min-w-0">
          <p key={reply} className="blk animate-[fade-in_160ms] bg-white px-3 py-2 text-[15px] font-semibold leading-snug text-[#0b1a44]">
            {reply}
          </p>
        </div>
      </div>

      <nav aria-label="전체 메뉴">
        <ol className="space-y-3 px-4 pb-8 pt-5">
          {ITEMS.map((item, i) => {
            const here = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  aria-current={here ? "page" : undefined}
                  onMouseEnter={() => setNear(i)}
                  onMouseLeave={() => setNear(null)}
                  onFocus={() => setNear(i)}
                  onBlur={() => setNear(null)}
                  className={`blk-btn block ${here ? "blk-strong" : ""}`}
                >
                  <span className="blk flex items-start gap-3 bg-cream px-3 py-3 text-ink">
                    <span aria-hidden className="grid size-6 shrink-0 place-items-center border-2 border-ink/20 font-pixel text-[15px] text-ink-muted">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-poster text-[22px] leading-tight">{item.title}</span>
                      <span className="mt-0.5 block text-[14px] text-ink-muted">{item.desc}</span>
                    </span>
                    {here && <span className="-rotate-6 shrink-0 whitespace-nowrap border-2 border-ink bg-[#ffffff] px-1.5 py-1 font-pixel-title text-[12px] leading-none text-ink">지금 여기</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
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
