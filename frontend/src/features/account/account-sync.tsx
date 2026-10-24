"use client";

import { useEffect } from "react";
import { adoptAvatar, type Avatar } from "@/features/avatar/avatar";
import { mergeCleared } from "@/features/scene/progress";
import { markPlayed } from "@/features/scene/track";
import { syncRewards } from "@/features/rewards/rewards";
import { loadAccount, saveAvatarIfNew } from "./account";
import { CARRY_PARAM } from "./in-app";

// 앱 안의 브라우저에서 넘어오며 주소에 실어 온 기록을 이 브라우저에 합치고, 주소에서는 지운다
function takeCarry() {
  const url = new URL(location.href);
  const raw = url.searchParams.get(CARRY_PARAM);
  if (!raw) return;
  try {
    const carry = JSON.parse(raw) as { c?: unknown; a?: Avatar | null };
    const cleared = Array.isArray(carry.c) ? carry.c.filter((id): id is string => typeof id === "string").slice(0, 500) : [];
    if (cleared.length > 0) {
      mergeCleared(cleared);
      markPlayed();
    }
    if (carry.a && typeof carry.a === "object") adoptAvatar(carry.a);
  } catch {}
  url.searchParams.delete(CARRY_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

// 어느 페이지로 들어오든 로그인 상태를 확인하고 기록과 보상을 맞춘다
export function AccountSync() {
  useEffect(() => {
    takeCarry();
    void (async () => {
      await loadAccount();
      await syncRewards();
      saveAvatarIfNew();
    })();
  }, []);
  return null;
}
