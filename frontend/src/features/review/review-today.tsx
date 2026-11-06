"use client";

import { useEffect, useState } from "react";
import { Mark } from "@/features/collection/expression-book";
import { BlockButton, SpeakerTag } from "@/features/scene/block-ui";
import { sfx } from "@/features/scene/sfx";
import { answerReview, loadReview, type ReviewToday as Today } from "./review";
import { markReviewed } from "./reviewed";

// 홈 맨 위의 오늘의 1분 복습. 지난번 처음 고른 답이 어색했던 질문을 다시 꺼내, 보기 없이 영어를 먼저 떠올려 보게 한 뒤 확인한다.
// 정답을 알아보는 것보다 스스로 떠올리는 게 더 오래 남아서다. 알았는지는 스스로 고르고, 그에 따라 다음에 물을 날이 정해진다
export function ReviewToday({ className = "" }: { className?: string }) {
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

  // 다 넘겼거나 오늘 물을 말이 없으면 오늘 복습은 끝난 것으로 남긴다
  useEffect(() => {
    if (today) {
      if (today.cards.length === 0) markReviewed("none");
      else if (at >= today.cards.length) markReviewed("done");
    }
  }, [today, at]);

  if (!today || today.cards.length === 0) return null;
  const card = today.cards[at];
  const total = today.cards.length;

  if (!card) {
    return (
      <p className={`bg-night-deep px-3 py-2.5 font-pixel text-[15px] text-paper-subtle ${className}`}>
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
    <section className={`animate-[fade-in_200ms] ${className}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-bold">오늘의 1분 복습</h2>
        <p className="text-[12px] text-paper-subtle">
          지난번 헷갈린 말 {at + 1}/{total}
        </p>
      </div>
      <div className="blk-frame mt-2">
        <div key={card.id} className="blk animate-[fade-in_200ms] bg-cream px-4 py-3.5 text-ink">
          <p className="text-[12px] text-ink-subtle">{card.title}</p>
          <div className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-1">
            <SpeakerTag>{card.partnerName}</SpeakerTag>
            <p className="font-line text-[18px] leading-snug">{card.partnerLine}</p>
            <SpeakerTag me>나</SpeakerTag>
            <p className="justify-self-start border border-dashed border-paper-subtle px-2.5 py-1.5 text-[16px] font-semibold leading-snug">{card.intent}</p>
          </div>
          {!revealed ? (
            // 묻는 말과 확인 버튼이 같은 행동이라 한 줄에 둔다. 질문은 왼쪽, 답을 여는 버튼은 오른쪽
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink/10 pt-3">
              <p className="text-[15px] font-bold">영어로 뭐라고 할까?</p>
              <BlockButton onClick={() => setRevealed(true)} reading className="shrink-0" faceClassName="px-4 py-2 text-[15px] font-bold">
                정답 보기
              </BlockButton>
            </div>
          ) : (
            <div className="mt-3 animate-[fade-in_200ms]">
              <p className="flex items-start gap-2">
                <span className="mt-1">
                  <Mark good />
                </span>
                <span className="min-w-0">
                  <span className="block font-line text-[20px] leading-snug">{card.right.line}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-subtle">{card.right.meaning}</span>
                </span>
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-subtle">
                <Mark good={false} />
                <span className="shrink-0">지난번 내가 고른 말</span>
                <s className="min-w-0 truncate decoration-rust decoration-2">{card.mine.line}</s>
              </p>
              <p className="mt-3.5 text-[14px] leading-relaxed text-ink-muted">{card.why}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <BlockButton onClick={() => next(false)} reading faceClassName="py-3 text-center text-[16px] font-bold">
                  몰랐어요
                </BlockButton>
                <BlockButton onClick={() => next(true)} reading faceClassName="py-3 text-center text-[16px] font-bold">
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
