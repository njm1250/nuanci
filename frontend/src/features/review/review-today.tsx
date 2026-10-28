"use client";

import { useEffect, useState } from "react";
import { Mark } from "@/features/collection/expression-book";
import { BlockButton } from "@/features/scene/block-ui";
import { sfx } from "@/features/scene/sfx";
import { answerReview, loadReview, type ReviewToday as Today } from "./review";

// 홈 맨 위의 오늘의 1분 복습. 지난번 처음 고른 답이 어색했던 질문을 다시 꺼내, 보기 없이 영어를 먼저 떠올려 보게 한 뒤 확인한다.
// 정답을 알아보는 것보다 스스로 떠올리는 게 더 오래 남아서다. 알았는지는 스스로 고르고, 그에 따라 다음에 물을 날이 정해진다
export function ReviewToday() {
  const [today, setToday] = useState<Today | null>(null);
  const [at, setAt] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [knewCount, setKnewCount] = useState(0);

  useEffect(() => {
    let alive = true;
    void loadReview().then((t) => alive && setToday(t));
    return () => {
      alive = false;
    };
  }, []);

  if (!today || today.cards.length === 0) return null;
  const card = today.cards[at];
  const total = today.cards.length;

  if (!card) {
    return (
      <p className="mb-6 bg-night-deep px-3 py-2.5 font-pixel text-[15px] text-paper-subtle">
        오늘 복습 끝 · {knewCount}/{total}개 떠올림
      </p>
    );
  }

  const next = (knew: boolean) => {
    answerReview(card.id, knew);
    if (knew) {
      sfx.good();
      setKnewCount((n) => n + 1);
    }
    setRevealed(false);
    setAt((i) => i + 1);
  };

  return (
    <section className="mb-7 animate-[fade-in_200ms]">
      <div className="flex items-baseline justify-between">
        <h2 className="font-pixel text-[15px]">오늘의 1분 복습</h2>
        <p className="text-[13px] text-paper-subtle">
          지난번 헷갈린 말 {at + 1}/{total}
        </p>
      </div>
      <div className="blk-frame mt-2">
        <div key={card.id} className="blk animate-[fade-in_200ms] bg-cream p-4 text-ink">
          <p className="text-[12px] text-ink-subtle">{card.title}</p>
          <div className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-1">
            <span className="justify-self-start bg-ink px-1.5 py-1 font-pixel text-[15px] leading-none text-paper">{card.partnerName}</span>
            <p className="font-line text-[19px] leading-snug">{card.partnerLine}</p>
            <span className="justify-self-start bg-ink px-1.5 py-1 font-pixel text-[15px] leading-none text-paper">나</span>
            <p className="font-pixel text-[15px] leading-snug">{card.intent}</p>
          </div>
          {!revealed ? (
            <>
              <p className="mt-3 font-pixel text-[15px]">
                <span className="hl">영어로 먼저 떠올려 보세요</span>
              </p>
              <BlockButton onClick={() => setRevealed(true)} className="mt-3 w-full" faceClassName="py-3 text-center font-pixel text-[15px]">
                눌러서 확인
              </BlockButton>
            </>
          ) : (
            <div className="mt-3 animate-[fade-in_200ms]">
              <p className="flex items-start gap-2">
                <span className="mt-1">
                  <Mark good />
                </span>
                <span className="min-w-0">
                  <span className="block font-line text-[20px] leading-snug">{card.right.line}</span>
                  <span className="block text-[13px] text-ink-subtle">{card.right.meaning}</span>
                </span>
              </p>
              <p className="mt-2 flex items-center gap-2 text-[13px] text-ink-subtle">
                <Mark good={false} />
                <span className="shrink-0">지난번 내가 고른 말</span>
                <s className="min-w-0 truncate">{card.mine.line}</s>
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{card.why}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <BlockButton onClick={() => next(false)} faceClassName="py-3 text-center font-pixel text-[15px]">
                  몰랐어요
                </BlockButton>
                <BlockButton primary onClick={() => next(true)} faceClassName="py-3 text-center font-pixel text-[15px]">
                  떠올렸어요
                </BlockButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
