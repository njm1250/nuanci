"use client";

import { useEffect } from "react";
import { loadAccount } from "./account";

// 어느 페이지로 들어오든 로그인 상태를 확인하고 기록을 맞춘다
export function AccountSync() {
  useEffect(() => {
    void loadAccount();
  }, []);
  return null;
}
