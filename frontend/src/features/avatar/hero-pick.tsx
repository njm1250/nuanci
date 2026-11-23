"use client";

import { useState } from "react";
import { useAccount } from "@/features/account/account";
import { PartnerFace } from "@/features/stage/partner-face";
import { sfx } from "@/features/scene/sfx";
import { setAvatar, useAvatar } from "./avatar";
import type { Hero } from "@/features/stage/types";

const KEY = "nuanci.heroAsked";
// 성별 낱말 없이 모습으로만 고른다. 이름표는 화면 낭독용으로 머리 모양을 말한다
const HEROES: { hero: Hero; cast: "meGirl" | "me"; label: string }[] = [
  { hero: "girl", cast: "meGirl", label: "긴 머리" },
  { hero: "boy", cast: "me", label: "짧은 머리" },
];

function asked() {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return true;
  }
}

// 첫 장면을 끝낸 뒤 한 번만, Mochi가 어느 모습이 너와 닮았는지 묻는다. 첫 질문 앞을 막지 않으려고 장면을 다 본 뒤에 둔다.
// 고르면 무대의 주인공이 바로 바뀌고, 안 골라도 아무 일 없이 넘어간다. 아지트에서 언제든 다시 바꿀 수 있다(동물의 숲식: 묻는 말은 Mochi의 반말, 보기는 그림)
export function HeroPick() {
  const avatar = useAvatar();
  const account = useAccount();
  // 처음 그릴 때만 물어볼지 정한다. 고른 뒤에도 이번 화면에서는 칸을 남겨 바뀐 결과를 보여 준다
  const [show] = useState(() => typeof window !== "undefined" && !asked());
  const [picked, setPicked] = useState(false);
  if (!show) return null;
  const pick = (hero: Hero) => {
    sfx.tap();
    try {
      localStorage.setItem(KEY, hero);
    } catch {}
    setAvatar({ ...avatar, hero }, account.status === "member");
    setPicked(true);
  };
  return (
    <section aria-label="내 모습 고르기" className="mb-6 animate-fade">
      <p className="font-label text-ui text-fg">{picked ? "좋아, 이제 이게 너야!" : "어느 쪽이 너랑 더 닮았어?"}</p>
      <div role="group" className="mt-2 flex gap-3">
        {HEROES.map((h) => {
          const on = avatar.hero === h.hero;
          return (
            <button
              key={h.hero}
              type="button"
              aria-label={h.label}
              aria-pressed={on}
              onClick={() => pick(h.hero)}
              className={`grid size-[76px] place-items-center border-2 bg-card-raised transition-colors duration-fast ${on ? "border-fg" : "border-line hover:border-fg"}`}
            >
              <PartnerFace partner={h.cast} expression={on && picked ? "happy" : "neutral"} size={56} />
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-meta text-fg-subtle">아지트에서 언제든 바꿀 수 있어</p>
    </section>
  );
}
