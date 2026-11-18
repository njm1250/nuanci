"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { MochiAsk } from "@/features/scene/scene-parts";
import { josa } from "@/features/scene/where";
import { dismiss, dismissed, pushSupport, savedHour, serverKey, subscribe, unsubscribe } from "./push";

const noop = () => () => {};
// 밤 9시부터 아침 8시는 광고성 알림에 별도 동의가 필요한 시간이라 고를 수 있는 때에서 뺀다
const HOURS = [
  { hour: 12, label: "점심 12시" },
  { hour: 18, label: "저녁 6시" },
  { hour: 20, label: "저녁 8시" },
] as const;
const labelOf = (hour: number) => HOURS.find((h) => h.hour === hour)?.label ?? `${hour}시`;

type State = "ask" | "busy" | "done" | "declined" | "denied" | "failed" | "off";

// 게임 속 대화 선택지. 고를 수 있는 줄에 손을 올리면 앞에 도트 화살표가 붙는다
function Choice({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="group flex min-h-11 w-full items-center gap-2 px-3 text-left font-label text-ui text-ink hover:bg-surface focus-visible:bg-surface disabled:opacity-60"
      >
        <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-pink opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
          <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
        </svg>
        {children}
      </button>
    </li>
  );
}

// 장면을 끝낸 자리에서 Mochi가 "내일 몇 시에 알려 줄까?"를 묻는다. 할지 말지가 아니라 언제를 고르는 대화라서,
// 내일 먼저 말을 걸 상대의 첫마디를 미리 들려주고 시간을 대답으로 고르게 한다. 거절도 같은 크기의 대답 하나로 둔다.
// 알림을 받을 수 없는 브라우저, 서버 키가 없을 때, 이미 구독했거나 한 번 거절한 뒤에는 띄우지 않는다
export function PushOffer({
  partnerName,
  partnerLine,
  onShown,
  onSubscribed,
}: {
  partnerName?: string;
  partnerLine?: string;
  onShown: () => void;
  onSubscribed: (hour: number) => void;
}) {
  const support = useSyncExternalStore(noop, pushSupport, () => "none" as const);
  const subscribedBefore = useSyncExternalStore(noop, () => savedHour() !== null, () => true);
  const declinedBefore = useSyncExternalStore(noop, dismissed, () => true);
  const [keyReady, setKeyReady] = useState(false);
  const [state, setState] = useState<State>("ask");
  const [hour, setHour] = useState<number | null>(null);
  const shown = useRef(false);
  const fireShown = useEffectEvent(onShown);

  useEffect(() => {
    if (support === "none" || subscribedBefore || declinedBefore) return;
    let live = true;
    serverKey().then((k) => live && setKeyReady(Boolean(k)));
    return () => {
      live = false;
    };
  }, [support, subscribedBefore, declinedBefore]);

  const visible = keyReady && support !== "none" && !subscribedBefore && !declinedBefore;
  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      fireShown();
    }
  }, [visible]);
  if (!visible) return null;

  const pick = async (h: number) => {
    setHour(h);
    setState("busy");
    const r = await subscribe(h);
    if (r === "ok") {
      setState("done");
      onSubscribed(h);
    } else setState(r);
  };
  const decline = () => {
    dismiss();
    setState("declined");
  };

  const who = partnerName || "다음 장면 친구";
  const line: React.ReactNode =
    state === "done"
      ? `좋아! 내일 ${labelOf(hour ?? 20)}에 ${who}${josa(who, "랑", "이랑")} 같이 부를게`
      : state === "declined"
        ? "알겠어! 그럼 기다리고 있을게"
        : state === "denied"
          ? "앗, 알림이 막혀 있대. 브라우저 사이트 설정에서 풀 수 있어"
          : state === "off"
            ? "알림 껐어. 언제든 다시 와!"
            : support === "ios-install"
              ? "아이폰은 홈 화면에 nuanci를 추가해야 내가 부를 수 있어. 공유 버튼 → 홈 화면에 추가!"
              : state === "failed"
                ? "어라, 알림을 못 켰어. 다시 골라 줄래?"
                : (
                    <>
                      내일 {who}
                      {josa(who, "가", "이")} 먼저 말 건대!{" "}
                      {/* 상대의 영어 첫마디는 무대 대사와 같은 글꼴로 둬서 Mochi 말과 갈린다 */}
                      {partnerLine && <span className="font-line text-say leading-snug">&ldquo;{partnerLine}&rdquo;</span>} 몇 시에 알려 줄까?
                    </>
                  );
  const asking = state === "ask" || state === "busy" || state === "failed";

  return (
    <section aria-label="내일 알림" className="mt-5">
      <MochiAsk>
        <span key={state} className="block animate-fade">
          {line}
        </span>
      </MochiAsk>
      {support === "ios-install" && asking ? (
        <ul className="ml-14 mt-1 border-2 border-ink bg-card-raised py-1">
          <Choice onClick={decline}>알겠어</Choice>
        </ul>
      ) : asking ? (
        <ul aria-label="대답 고르기" className="ml-14 mt-1 border-2 border-ink bg-card-raised py-1">
          {HOURS.map((h) => (
            <Choice key={h.hour} onClick={() => pick(h.hour)} disabled={state === "busy"}>
              {h.label}에 알려 줘!
            </Choice>
          ))}
          <Choice onClick={decline} disabled={state === "busy"}>
            괜찮아, 내가 올게
          </Choice>
        </ul>
      ) : state === "done" ? (
        <button type="button" onClick={() => (unsubscribe(), setState("off"))} className="-mx-1 ml-14 mt-1 min-h-11 px-1 text-note text-fg-subtle underline underline-offset-4">
          알림 끄기
        </button>
      ) : null}
    </section>
  );
}
