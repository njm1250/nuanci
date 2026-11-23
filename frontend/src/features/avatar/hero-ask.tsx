"use client";

import { Mascot } from "@/features/mascot/mascot";

const KEY = "nuanci.heroAsked";

export function heroAsked() {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return true;
  }
}

export function markHeroAsked(value: string) {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
}

// 첫 장면의 엔딩 컷 뒤, 동물의 숲 대화창처럼 Mochi의 질문과 선택지를 띄운다. 무대에는 두 모습이 나란히 서 있고(왼쪽 = 지금 모습),
// 선택지를 누르거나 무대의 캐릭터를 직접 누르면 고른다. 캐릭터는 무대 아래쪽에 서 있어서, 가리지 않게 비어 있는 무대 위쪽(벽 자리)에 띄운다. 화면을 막지 않아 안 고르고 넘어가도 된다
export function HeroAsk({ done, onPick, className = "" }: { done: boolean; onPick: (side: "left" | "right") => void; className?: string }) {
  return (
    <div className={`absolute inset-x-3 top-3 flex justify-center md:top-5 ${className}`}>
      {/* 질문과 선택지 모두 무대 말풍선과 같은 결: 흰 바탕에 짙은 도트 테두리, 무대 글꼴 */}
      <div className="flex w-full max-w-[19rem] animate-fade flex-col gap-2.5">
        <div className="blk-frame-sm">
          <div className="blk flex items-center gap-2 bg-white px-2.5 py-1.5 text-ink-fixed">
            <Mascot scale={2} className="shrink-0" />
            <p key={String(done)} className="animate-fade font-stage text-note leading-snug">
              {done ? "좋아, 이제 이게 너야!" : "어느 쪽이 너랑 더 닮았어?"}
            </p>
          </div>
        </div>
        {!done && (
          <div role="group" aria-label="내 모습 고르기" className="grid grid-cols-2 gap-2.5">
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={(e) => (e.stopPropagation(), onPick(side))}
                className="blk-frame-sm group block transition-transform duration-press active:translate-y-px"
              >
                <span className="blk flex min-h-10 items-center justify-center gap-1.5 bg-white font-stage text-note text-ink-fixed group-hover:bg-[var(--blue-50)]">
                  {side === "left" && <span aria-hidden>◀</span>}
                  {side === "left" ? "왼쪽이 나!" : "오른쪽이 나!"}
                  {side === "right" && <span aria-hidden>▶</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
