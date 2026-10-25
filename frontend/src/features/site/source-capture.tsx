"use client";

import { useEffect } from "react";
import { captureSource } from "@/features/scene/track";

// 이벤트를 보내지 않는 페이지로 들어와도, 앱 안에서 이동해 주소의 utm 꼬리표가 사라지기 전에 출처를 읽어 둔다
export function SourceCapture() {
  useEffect(() => {
    captureSource();
  }, []);
  return null;
}
