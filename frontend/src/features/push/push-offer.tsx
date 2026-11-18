"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { MochiAsk } from "@/features/scene/scene-parts";
import { josa } from "@/features/scene/where";
import { dismiss, dismissed, pushSupport, savedHour, serverKey, subscribe, unsubscribe } from "./push";

const noop = () => () => {};

// 도트 아이콘: 한낮의 해, 저녁 노을, 밤 달, 내가 직접 갈게(고양이 발). 그림이라 색을 직접 쓴다
const ICONS = {
  noon: (
    <g fill="#f5b83d">
      <rect x="3" y="3" width="4" height="4" />
      <rect x="4" y="2" width="2" height="6" />
      <rect x="2" y="4" width="6" height="2" />
      <rect x="0" y="4" width="1" height="1" />
      <rect x="9" y="5" width="1" height="1" />
      <rect x="4" y="0" width="1" height="1" />
      <rect x="5" y="9" width="1" height="1" />
    </g>
  ),
  dusk: (
    <g>
      <rect x="2" y="4" width="6" height="2" fill="#f08a4b" />
      <rect x="3" y="3" width="4" height="1" fill="#f08a4b" />
      <rect x="0" y="6" width="10" height="1" fill="#0b1a44" />
      <rect x="2" y="8" width="6" height="1" fill="#a3abc4" />
      <rect x="1" y="1" width="1" height="1" fill="#f08a4b" />
      <rect x="8" y="1" width="1" height="1" fill="#f08a4b" />
    </g>
  ),
  night: (
    <g>
      <rect x="3" y="1" width="3" height="1" fill="#f5b83d" />
      <rect x="2" y="2" width="2" height="6" fill="#f5b83d" />
      <rect x="3" y="8" width="3" height="1" fill="#f5b83d" />
      <rect x="4" y="7" width="3" height="1" fill="#f5b83d" />
      <rect x="8" y="2" width="1" height="1" fill="#a3abc4" />
      <rect x="7" y="5" width="1" height="1" fill="#a3abc4" />
    </g>
  ),
  paw: (
    <g fill="#f0a24a">
      <rect x="1" y="1" width="2" height="2" />
      <rect x="4" y="0" width="2" height="2" />
      <rect x="7" y="1" width="2" height="2" />
      <rect x="2" y="4" width="6" height="4" />
      <rect x="3" y="8" width="4" height="1" />
    </g>
  ),
} as const;

// 밤 9시부터 아침 8시는 광고성 알림에 별도 동의가 필요한 시간이라 고를 수 있는 때에서 뺀다
const HOURS = [
  { hour: 12, label: "점심 12시", icon: "noon" },
  { hour: 18, label: "저녁 6시", icon: "dusk" },
  { hour: 20, label: "저녁 8시", icon: "night" },
] as const;
const labelOf = (hour: number) => HOURS.find((h) => h.hour === hour)?.label ?? `${hour}시`;

type State = "ask" | "busy" | "done" | "declined" | "denied" | "failed" | "off";

// 대답 하나. 말풍선 모양의 누르는 칸에 도트 아이콘과 두 줄 대답. 손을 올리면 오른쪽 위에 도트 커서가 붙는다
function Answer({ icon, main, sub, onClick, disabled }: { icon: keyof typeof ICONS; main: string; sub: string; onClick: () => void; disabled: boolean }) {
  return (
    <li>
      <button type="button" onClick={onClick} disabled={disabled} className="blk-btn group block h-full w-full text-left disabled:opacity-60">
        <span className="blk relative flex h-full items-center gap-2.5 bg-card-raised px-3 py-2.5 text-ink">
          <svg width="20" height="20" viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden className="shrink-0">
            {ICONS[icon]}
          </svg>
          <span className="min-w-0 leading-snug">
            <span className="block text-ui font-bold">{main}</span>
            <span className="block text-note text-ink-muted">{sub}</span>
          </span>
          <svg width="8" height="8" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="absolute right-1.5 top-1.5 fill-pink opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
            <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
          </svg>
        </span>
      </button>
    </li>
  );
}

// 장면을 끝낸 자리, 다음 장면 예고 바로 아래에서 Mochi가 "몇 시에 알려 줄까?"를 묻는다. 할지 말지가 아니라 언제를 고르는 대화이고,
// 거절도 같은 크기의 대답 하나로 둔다(숨기면 다크 패턴). 알림을 받을 수 없는 브라우저, 서버 키가 없을 때,
// 이미 구독했거나 한 번 거절한 뒤에는 띄우지 않는다
export function PushOffer({ partnerName, onShown, onSubscribed }: { partnerName?: string; onShown: () => void; onSubscribed: (hour: number) => void }) {
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
  const asking = state === "ask" || state === "busy" || state === "failed";
  const bubble =
    state === "done" ? (
      <>
        좋아! 내일 {labelOf(hour ?? 20)}에 {who}
        {josa(who, "랑", "이랑")} 같이 부를게
      </>
    ) : state === "declined" ? (
      "알겠어! 그럼 기다리고 있을게"
    ) : state === "denied" ? (
      "앗, 알림이 막혀 있대. 브라우저 사이트 설정에서 풀 수 있어"
    ) : state === "off" ? (
      "알림 껐어. 언제든 다시 와!"
    ) : support === "ios-install" ? (
      "아이폰은 홈 화면에 nuanci를 추가해야 내가 부를 수 있어. 공유 → 홈 화면에 추가!"
    ) : (
      <>
        <span className="block font-sans text-note text-ink-muted">
          {state === "failed" ? "어라, 알림을 못 켰어. 다시 골라 줄래?" : `내일 ${who}${josa(who, "가", "이")} 먼저 말 건대!`}
        </span>
        <span className="mt-0.5 block text-title">몇 시에 알려 줄까?</span>
      </>
    );

  return (
    <section aria-label="내일 알림" className="mt-4">
      <MochiAsk>
        <span key={state} className="block animate-fade">
          {bubble}
        </span>
      </MochiAsk>
      {support === "ios-install" && asking ? (
        <button type="button" onClick={decline} className="-mx-1 mt-1 min-h-11 px-1 text-note text-fg-subtle underline underline-offset-4">
          알겠어
        </button>
      ) : asking ? (
        <>
          <p className="mt-3 font-label text-meta text-fg-subtle">내 대답</p>
          <ul aria-label="내 대답" className="mt-1.5 grid grid-cols-2 gap-2.5">
            {HOURS.map((h) => (
              <Answer key={h.hour} icon={h.icon} main={`${h.label}에`} sub="알려 줘!" onClick={() => pick(h.hour)} disabled={state === "busy"} />
            ))}
            <Answer icon="paw" main="괜찮아," sub="내가 올게" onClick={decline} disabled={state === "busy"} />
          </ul>
        </>
      ) : state === "done" ? (
        <div className="mt-1 flex gap-4">
          <button type="button" onClick={() => setState("ask")} className="-mx-1 min-h-11 px-1 text-note text-fg-subtle underline underline-offset-4 hover:text-fg">
            시간 다시 고르기
          </button>
          <button type="button" onClick={() => (unsubscribe(), setState("off"))} className="-mx-1 min-h-11 px-1 text-note text-fg-subtle underline underline-offset-4 hover:text-fg">
            알림 끄기
          </button>
        </div>
      ) : null}
    </section>
  );
}
