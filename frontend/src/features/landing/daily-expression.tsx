"use client";

import { useEffect, useState } from "react";
import { Mark } from "@/features/collection/expression-book";
import { bookEntry, spoken, type ExpressionPair } from "@/features/collection/pairs";
import { useCleared } from "@/features/scene/progress";
import type { Scene } from "@/features/scene/types";
import { useKstDay } from "@/features/streak/kst-day";

// 홈의 오늘의 복습. 해 본 장면에서 하루 한 쌍을 골라, 영어는 가려 두고 눌러야 보여준다.
// 스스로 떠올려 본 뒤 확인하면 다시 읽기만 할 때보다 오래 기억한다
export function DailyExpression({ scenes }: { scenes: { id: string; title: string }[] }) {
  const cleared = useCleared();
  const pool = scenes.filter((s) => cleared.includes(s.id));
  // 같은 날에는 같은 표현이 나오게 한국 시간 날짜로 고른다
  const day = useKstDay() ?? 0;
  const pick = pool.length > 0 ? pool[day % pool.length] : null;
  const [loaded, setLoaded] = useState<{ id: string; pair: ExpressionPair } | null>(null);
  const [shownFor, setShownFor] = useState<string | null>(null);

  useEffect(() => {
    if (!pick) return;
    let alive = true;
    fetch(`/api/scenes/${pick.id}`)
      .then((r) => (r.ok ? (r.json() as Promise<Scene>) : null))
      .then((scene) => {
        const pairs = scene ? bookEntry(scene).pairs : [];
        if (alive && pairs.length > 0) setLoaded({ id: pick.id, pair: pairs[day % pairs.length] });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pick?.id, day]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pick || loaded?.id !== pick.id) return null;
  const { pair } = loaded;
  const shown = shownFor === pick.id;

  return (
    <section className="mt-6 animate-[fade-in_200ms]">
      <h2 className="font-pixel text-[15px] text-paper-subtle">오늘의 복습</h2>
      <div className="blk-frame mt-2">
        <div className="blk bg-cream px-4 py-3 text-ink">
          <p className="text-[12px] text-ink-subtle">
            {pick.title} · {pair.who}
          </p>
          <p className="mt-1 text-[16px] font-semibold leading-snug">{spoken(pair.intent)}</p>
          <p className="mt-2 flex items-center gap-2 text-[14px] text-ink-subtle">
            <Mark good={false} />
            <s className="min-w-0">{pair.wrong}</s>
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Mark good />
            {shown ? (
              <p className="animate-[fade-in_200ms] text-[16px] font-semibold leading-snug">{pair.right}</p>
            ) : (
              <button type="button" onClick={() => setShownFor(pick.id)} className="min-h-9 flex-1 border-2 border-dashed border-ink/30 px-2 text-left font-pixel text-[13px] text-ink-subtle">
                눌러서 보기
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
