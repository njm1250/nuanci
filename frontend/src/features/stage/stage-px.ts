"use client";

import { useEffect, useRef, useState } from "react";

// 무대는 너비와 상관없이 가로 400칸 안팎의 도트로 그린다
export const PIXELS_WIDE = 400;

// 무대 도트 한 칸이 화면에서 차지하는 크기(CSS px). 화면의 실제 픽셀 수를 정수로 나눠 그려서 넓은 무대에서는 2처럼 커진다
export const stagePixel = (width: number, device: number) => Math.max(1, Math.round((width * device) / PIXELS_WIDE)) / device;

// 넓은 무대(데스크톱)에서는 인물이 도트 크기만큼 커지는데 말풍선은 그대로라 글자가 상대적으로 작아진다.
// 무대 칸의 도트 크기를 재서 말풍선에 곱할 배율로 돌려준다. 휴대폰 무대는 기기마다 값이 조금씩 달라도 1로 둬서 지금 배치를 건드리지 않는다
export function useBubbleScale<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const px = stagePixel(entry.contentRect.width, window.devicePixelRatio || 1);
      setScale(px < 1.4 ? 1 : px);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}
