"use client";

import { useEffect, useState } from "react";

// 머리줄을 화면 위에 붙여 두되, 아래로 읽어 내려갈 때는 비켜 주고 위로 올리면 다시 내려온다.
// 긴 목록에서 뒤로 가기·메뉴를 쓰려고 맨 위까지 올라가지 않게 하면서, 모바일 화면을 늘 56px 가리지는 않는다.
// 보이는 높이는 --header-shown에 남겨서, 같이 화면에 붙는 칸(아지트 무대)이 그만큼 비켜 붙는다
const MOVE = 6;
const TOP = 64;

export function ScrollHeader({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = window.scrollY;
        const d = y - last;
        if (y < TOP) setHidden(false);
        else if (d > MOVE) setHidden(true);
        else if (d < -MOVE) setHidden(false);
        if (Math.abs(d) > MOVE) last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--header-shown", hidden ? "0px" : "var(--header-h)");
    return () => void document.documentElement.style.removeProperty("--header-shown");
  }, [hidden]);

  return (
    <header
      data-hidden={hidden || undefined}
      className="sticky top-0 z-30 bg-ink text-fg transition-transform duration-base ease-out data-[hidden]:-translate-y-full motion-reduce:transition-none"
    >
      {children}
    </header>
  );
}
