"use client";

import { useSyncExternalStore } from "react";
import { useHeroLook } from "@/features/rewards/hero-look";
import { BlockLink } from "@/features/scene/block-ui";
import { PICK_PARAM, visitorId } from "@/features/scene/track";
import type { Motion } from "@/features/scene/types";
import { useReducedMotion } from "@/features/scene/use-scene-flow";
import { Num } from "@/features/scene/verdict";
import { C } from "@/features/stage/palette";
import { Stage } from "@/features/stage/stage";
import type { StageSpec } from "@/features/stage/types";
import { SET_WALLS } from "@/features/stage/walls";
import { AttractReel } from "./attract-reel";
import type { ReelBeat } from "./reel";
import { useIdle } from "./use-idle";

// 첫 방문 홈 실험. 홈에 온 사람 열에 여덟이 장면을 열지 않고 나가서, 절반(B)에게는 데모와 시작 버튼 대신 첫 장면의 질문과 보기를 홈에 바로 놓는다.
// 방문자 id 마지막 글자로 나눈다(복습 위치 실험은 첫 글자를 쓴다). 이벤트는 그대로라서 SQL에서 같은 규칙으로 두 묶음을 가른다
export type FirstPick = {
  number: number;
  context: string;
  intent: string;
  partnerLine: string;
  partnerMotion: Motion;
  stage: StageSpec;
  choices: { id: string; line: string }[];
};

const noop = () => () => {};

function arm(): "a" | "b" {
  // 주소에 arm=a|b를 붙이면 그 화면을 바로 볼 수 있다
  const forced = /[?&]arm=([ab])/.exec(location.search)?.[1];
  if (forced === "a" || forced === "b") return forced;
  return parseInt(visitorId().slice(-1), 16) % 2 === 1 ? "b" : "a";
}

export function useHomeArm() {
  return useSyncExternalStore(noop, arm, () => null);
}

// B는 첫 장면의 상대가 말을 걸어 둔 채로 멈춰 있는 무대, A는 지금까지의 자동 데모
export function HeroStage({ beats, first }: { beats: ReelBeat[]; first: FirstPick | null }) {
  const b = useHomeArm() === "b" && first !== null;
  const look = useHeroLook();
  const reduced = useReducedMotion();
  const idle = useIdle();
  if (!b) return <AttractReel beats={beats} />;
  return (
    <div className="absolute inset-0">
      {idle ? (
        <Stage
          spec={{ ...first.stage, hero: look.hero, wear: look.wear }}
          reduced={reduced}
          state={{ partnerMotion: first.partnerMotion, partnerKey: 0, talkKey: 0, reaction: null, partnerLine: first.partnerLine, meTurn: true }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0" style={{ background: SET_WALLS[first.stage.set][first.stage.time] }}>
          <div className="absolute inset-x-0 bottom-0 h-[18%]" style={{ background: C.floor }} />
        </div>
      )}
    </div>
  );
}

// B는 소개 문장 자리에 질문과 보기 셋을 놓는다. 보기를 누르면 그 답을 고른 채로 장면에 들어간다
export function HeroAsk({ first, children }: { first: FirstPick | null; children: React.ReactNode }) {
  const b = useHomeArm() === "b" && first !== null;
  if (!b) return <>{children}</>;
  return (
    <div className="pb-6 min-[960px]:pb-0">
      <p className="text-note leading-normal text-fg-muted">{first.context}</p>
      <p className="mt-2 text-body font-bold leading-snug text-fg">「{first.intent}」 영어로 뭐라고 할래?</p>
      <ul className="mt-3 space-y-2.5">
        {first.choices.map((c, i) => (
          <li key={c.id}>
            <BlockLink href={`/scenes/${first.number}?${PICK_PARAM}=${encodeURIComponent(c.id)}`} entry="home" className="group">
              <span className="flex items-center gap-3 text-left">
                <Num n={i + 1} hover />
                <span className="min-w-0 flex-1 font-line text-say font-normal leading-snug">{c.line}</span>
              </span>
            </BlockLink>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-note text-fg-subtle">가입 없이 바로 · 고르면 상대가 반응해요</p>
    </div>
  );
}

// 시작 버튼 띠. B에서는 보기가 곧 시작이라 숨긴다. 홈 방문 기록은 이 안의 버튼이 남기므로 지우지 않고 가리기만 한다
export function CtaBar({ className, children }: { className: string; children: React.ReactNode }) {
  const b = useHomeArm() === "b";
  return <div className={b ? "hidden" : className}>{children}</div>;
}
