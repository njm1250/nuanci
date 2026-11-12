"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { hasPlayed } from "@/features/scene/track";

// 첫 방문 중에 로고를 누르는 사람은 "여기가 뭐지?"가 궁금한 사람이다. 장면을 하나 하면 재방문 홈으로 바뀌어서
// 소개를 못 보고 나가기에, 처음 들어온 그 방문(탭을 닫기 전까지)에는 로고가 소개 화면으로 간다
const SEEN_KEY = "nuanci.seen";
const FIRST_KEY = "nuanci.firstSession";

function firstSession() {
  try {
    let v = sessionStorage.getItem(FIRST_KEY);
    if (v === null) {
      v = localStorage.getItem(SEEN_KEY) || hasPlayed() ? "0" : "1";
      sessionStorage.setItem(FIRST_KEY, v);
      localStorage.setItem(SEEN_KEY, "1");
    }
    return v === "1";
  } catch {
    return false;
  }
}

const noop = () => () => {};

export function LogoLink({ className, children }: { className: string; children: React.ReactNode }) {
  const first = useSyncExternalStore(noop, firstSession, () => false);
  return (
    <Link href={first ? "/?intro" : "/"} aria-label="nuanci" className={className}>
      {children}
    </Link>
  );
}
