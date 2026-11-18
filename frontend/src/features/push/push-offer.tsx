"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { dismiss, dismissed, pushSupport, savedHour, serverKey, subscribe, unsubscribe } from "./push";

const noop = () => () => {};
const HOURS = [
  { hour: 8, label: "아침 8시" },
  { hour: 12, label: "점심 12시" },
  { hour: 21, label: "밤 9시" },
] as const;
const labelOf = (hour: number) => HOURS.find((h) => h.hour === hour)?.label ?? `${hour}시`;

// 장면을 끝낸 자리에서 내일 다시 부를 시간을 고르게 한다. 매일 같은 시각 일괄 알림 대신 사용자가 고른 때에, 다음 장면 상대의 첫마디가 온다.
// 알림을 받을 수 없는 브라우저, 서버 키가 없을 때, 이미 구독했거나 "괜찮아요"를 누른 뒤에는 띄우지 않는다
export function PushOffer({ onShown, onSubscribed }: { onShown: () => void; onSubscribed: (hour: number) => void }) {
  const support = useSyncExternalStore(noop, pushSupport, () => "none" as const);
  const subscribedBefore = useSyncExternalStore(noop, () => savedHour() !== null, () => true);
  const hiddenBefore = useSyncExternalStore(noop, dismissed, () => true);
  const [keyReady, setKeyReady] = useState(false);
  const [state, setState] = useState<{ kind: "idle" } | { kind: "busy" } | { kind: "done"; hour: number } | { kind: "denied" } | { kind: "failed" } | { kind: "off" } | { kind: "closed" }>({ kind: "idle" });
  const shown = useRef(false);
  // 부모가 매번 새 함수를 넘겨도 보인 순간 한 번만 남긴다
  const fireShown = useEffectEvent(onShown);

  useEffect(() => {
    if (support === "none" || subscribedBefore || hiddenBefore) return;
    let live = true;
    serverKey().then((k) => live && setKeyReady(Boolean(k)));
    return () => {
      live = false;
    };
  }, [support, subscribedBefore, hiddenBefore]);

  const visible = keyReady && support !== "none" && !subscribedBefore && !hiddenBefore && state.kind !== "closed";
  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      fireShown();
    }
  }, [visible]);
  if (!visible) return null;

  const pick = async (hour: number) => {
    setState({ kind: "busy" });
    const r = await subscribe(hour);
    if (r === "ok") {
      setState({ kind: "done", hour });
      onSubscribed(hour);
    } else setState({ kind: r });
  };

  return (
    <section aria-label="내일 알림" className="mt-4 border-2 border-fg bg-card-raised px-4 py-3.5 text-ink">
      {state.kind === "done" ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-ui font-bold">내일 {labelOf(state.hour)}에 부를게요</p>
          <button type="button" onClick={() => (unsubscribe(), setState({ kind: "off" }))} className="-mx-1 min-h-11 shrink-0 px-1 text-note text-ink-subtle underline underline-offset-4">
            알림 끄기
          </button>
        </div>
      ) : state.kind === "off" ? (
        <p className="text-note text-ink-muted">알림을 껐어요.</p>
      ) : state.kind === "denied" ? (
        <p className="text-note text-ink-muted">알림이 막혀 있어요. 브라우저 사이트 설정에서 켤 수 있어요.</p>
      ) : (
        <>
          <p className="text-ui font-bold">내일 이어서 할래요?</p>
          {support === "ios-install" ? (
            <p className="mt-1 text-note leading-relaxed text-ink-muted">아이폰은 홈 화면에 추가한 nuanci에서 알림을 받아요. 공유 버튼 → 홈 화면에 추가 후 거기서 열어 주세요.</p>
          ) : (
            <>
              <p className="mt-1 text-note text-ink-muted">고른 시간에 다음 장면 상대가 먼저 말을 걸어요</p>
              <div role="group" aria-label="알림 받을 시간" className="mt-3 grid grid-cols-3 gap-2">
                {HOURS.map((h) => (
                  <button
                    key={h.hour}
                    type="button"
                    disabled={state.kind === "busy"}
                    onClick={() => pick(h.hour)}
                    className="min-h-11 border-2 border-ink bg-card font-label text-ui text-ink hover:bg-surface disabled:opacity-60"
                  >
                    {h.label}
                  </button>
                ))}
              </div>
              {state.kind === "failed" && <p className="mt-2 text-note text-bad">알림을 켜지 못했어요. 다시 눌러 주세요.</p>}
            </>
          )}
          <button type="button" onClick={() => (dismiss(), setState({ kind: "closed" }))} className="-mx-1 mt-1.5 min-h-11 px-1 text-note text-ink-subtle underline underline-offset-4">
            괜찮아요
          </button>
        </>
      )}
    </section>
  );
}
