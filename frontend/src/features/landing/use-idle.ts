"use client";

import { useEffect, useState } from "react";

// 페이지를 다 불러온 뒤 브라우저가 한가해지면 true가 된다. 첫 화면에 꼭 필요하지 않은 무거운 일(three.js 무대 등)을 이때 시작한다
export function useIdle() {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let handle: number | undefined;
    const go = () => {
      handle = "requestIdleCallback" in window ? window.requestIdleCallback(() => setIdle(true), { timeout: 1500 }) : self.setTimeout(() => setIdle(true), 300);
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => {
      window.removeEventListener("load", go);
      if (handle === undefined) return;
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(handle);
      else self.clearTimeout(handle);
    };
  }, []);
  return idle;
}
