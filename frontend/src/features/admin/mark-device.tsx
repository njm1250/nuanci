"use client";

import { useEffect } from "react";
import { visitorId } from "@/features/scene/track";
import { markInternalVisitor } from "./actions";

const KEY = "nuanci.internal";

// 관리자 화면을 연 기기는 내가 쓰는 기기로 보고, 이 기기의 방문 기록을 지표에서 빼도록 한 번만 등록한다
export function MarkDevice() {
  useEffect(() => {
    const id = visitorId();
    try {
      if (localStorage.getItem(KEY) === id) return;
    } catch {}
    void markInternalVisitor(id).then(() => {
      try {
        localStorage.setItem(KEY, id);
      } catch {}
    });
  }, []);
  return null;
}
