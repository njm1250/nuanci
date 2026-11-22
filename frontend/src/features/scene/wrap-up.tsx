"use client";

import { whenSaying } from "./where";
import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { bookEntry } from "@/features/collection/pairs";
import { useInquiry } from "@/features/inquiry/inquiry-form";
import { Mascot } from "@/features/mascot/mascot";
import { RewardIcon } from "@/features/rewards/reward-icon";
import { RewardReveal } from "@/features/rewards/reward-reveal";
import { isUnopened, type RewardItem } from "@/features/rewards/rewards";
import { type StreakMoment } from "@/features/streak/streak";
import { StreakMomentCard } from "@/features/streak/streak-ui";
import { usePackVoice, useVoice, VOICE_MIN } from "@/features/progression/voice";
import { BlockButton, EntryLink } from "./block-ui";
import { sfx } from "./sfx";
import { type Scene } from "./types";
import { Arrow } from "./scene-parts";
import { RUN_SIZE, runDoneAt, runShareMessage, useRun } from "./run";
import { RunResult, RunResultWaiting, RunSteps, WaitDots } from "./run-ui";
import { useShare } from "./use-scene-flow";
import { PushOffer } from "@/features/push/push-offer";
import { SceneThumb, ThumbStudio } from "@/features/landing/scene-thumb";
import { MapPin } from "@/features/site/map-pin";
import type { StageSpec } from "@/features/stage/types";
import { FEATURE_LIST, type OrderItem } from "./collections";
import { useCleared } from "./progress";
import { useSeason } from "@/features/season/season";
import { CoverSnow } from "@/features/season/season-decor";

// 다음 장면 예고. 완료 화면 끝에 올라와 장면 사이에 홈 화면 없이 다음 장면으로 이어진다
export type NextAsk = { number: number; title: string; place: string; stage?: StageSpec; partnerName: string; partnerLine: string };

// 장면 3개 결과 아래의 보조 입구: 기간 중 시즌 특집 하나(상시 팩은 메인 경로가 아니라 여기 두지 않는다). 첫 방문자는 홈을 거치지 않고 장면에서 장면으로 가서, 흐름이 한 번 끊기는 이 자리에 갈림길을 둔다.
// 주 버튼(다음 장면)은 그대로이고 이건 흰 카드다. 지금 장면이 이미 그 특집이면 띄우지 않는다
function FeatureDetour({ order, current }: { order: OrderItem[]; current: string }) {
  const season = useSeason();
  const cleared = useCleared();
  const here = order.find((s) => s.id === current)?.collection;
  const lane = FEATURE_LIST.filter((f) => f.kind === "season" && season.states[f.slug] === "live" && f.slug !== here)
    .sort((a, b) => a.priority - b.priority)
    .map((f) => ({ feature: f, scenes: order.filter((s) => s.collection === f.slug) }))
    .find((l) => l.scenes.length > 0);
  if (!lane) return null;
  const target = lane.scenes.find((s) => !cleared.includes(s.id)) ?? lane.scenes[0];
  const done = lane.scenes.filter((s) => cleared.includes(s.id)).length;
  return (
    <EntryLink href={`/scenes/${target.number}`} entry="next" className="blk-btn mt-4 block">
      <span className="blk flex items-center gap-3 bg-card-raised p-2.5 pr-3 text-ink">
        {lane.feature.cover && (
          <span className="relative w-20 shrink-0">
            <SceneThumb stage={lane.feature.cover} className="aspect-[4/3] w-full border-2 border-line" />
            <CoverSnow decor={lane.feature.decor} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-bold leading-snug">{lane.feature.name}</span>
          <span className="mt-0.5 block text-meta text-ink-subtle">{done > 0 ? `${lane.scenes.length}개 중 ${done}개 해 봄` : `장면 ${lane.scenes.length}개`}</span>
        </span>
        <Arrow />
      </span>
    </EntryLink>
  );
}

// 고른 말을 들은 상대가 무대에서 반응을 말하기까지의 시간. 생각 말풍선은 650ms에 떠서 3050ms에 사라진다
export const REACT_AFTER = 1100;
export const REACT_AFTER_IMAGINE = 3100;

// 완료 화면의 팡파르(0.75초부터 1.6초쯤까지)가 끝난 뒤 연속 기록 줄이 들어오고, 새 물건 카드는 그다음에 들어온다.
// 축하 소리가 겹치지 않게 하나씩 차례로 울린다
export const STREAK_DELAY = 1600;
export const AFTER_STREAK = 750;
// 새 물건 카드가 들어오는 순간 주인공도 무대에서 그 물건을 받고, 이만큼 보여준 뒤 원래 엔딩으로 돌아간다
export const PRIZE_MS = 4000;

// 완료 화면에서 무대에 올릴 새 물건. 쓰는 아이템을 먼저 골라 주인공이 직접 써 보게 한다
export function stagePrize(granted: RewardItem[]) {
  return granted.find((i) => i.kind === "wear" && !isUnopened(i)) ?? granted[0] ?? null;
}

// 무대 위 주인공 말풍선에 띄우는 새 물건. 상자는 열기 전이라 무엇인지 감춘다
export function PrizeNote({ item }: { item: RewardItem }) {
  const box = isUnopened(item);
  return (
    <span className="flex items-center gap-1.5">
      <RewardIcon id={box ? "box" : item.id} color={item.owned?.color} size={24} />
      <span>{box ? "깜짝 상자다!" : `${item.name} 득템!`}</span>
    </span>
  );
}

// 장면을 끝낸 뒤의 완료 화면. 이 장면의 발견(한 줄 정리와 모은 표현)을 가운데 두고, 연속 기록·새 물건은 작게 덧붙인 뒤 친구에게 문제 내기를 권한다
export function WrapUp({
  scene,
  share,
  shareState,
  replying = false,
  onPushShown,
  onPushSubscribed,
  onBack,
  granted,
  reduced,
  onRewardShown,
  streak,
  streakAt = STREAK_DELAY,
  rewardAt,
  pickedIds = [],
  nextAsk = null,
  askAt = 600,
  onNext,
  runOn = false,
  onRunShared,
  order = [],
}: {
  // 기간 중 특집의 보조 입구를 고르는 데 쓰는 장면 순서(모음 표시 포함)
  order?: OrderItem[];
  onNext?: () => void;
  // 이 장면을 판(장면 셋)으로 세는지. 판이 끝나는 장면에서는 결과 장이 맨 위에 온다
  runOn?: boolean;
  onRunShared?: () => void;
  pickedIds?: string[];
  nextAsk?: NextAsk | null;
  // 엔딩 컷을 다 본 뒤에 다음 질문이 올라오도록 기다리는 시간(ms)
  askAt?: number;
  scene: Scene;
  share: () => void;
  shareState: "idle" | "copied" | "failed";
  // 친구가 낸 문제로 들어왔으면 문제 내기 대신 답장하기
  replying?: boolean;
  onPushShown?: () => void;
  onPushSubscribed?: (hour: number) => void;
  onBack: () => void;
  granted: RewardItem[];
  reduced: boolean;
  onRewardShown: (ids: string[]) => void;
  streak: StreakMoment | null;
  // 연속 기록 줄이 뜨고 소리가 나는 때(ms). 엔딩 컷이 있으면 펀치라인 소리 뒤로 민다
  streakAt?: number;
  rewardAt: number;
}) {
  const { pairs } = bookEntry(scene, pickedIds);
  const run = useRun();
  const runDone = runOn && runDoneAt(run, scene.id);
  const { state: runShareState, share: shareRun } = useShare("/?utm_source=share&utm_medium=run", runShareMessage(run), onRunShared);
  const [askShown, setAskShown] = useState(false);
  useEffect(() => {
    if (!nextAsk && !runDone) return;
    const t = window.setTimeout(() => setAskShown(true), askAt);
    return () => clearTimeout(t);
  }, [nextAsk, runDone, askAt]);
  // 개발자 팩에서는 팩 안의 답만 센 "내 리뷰 말투"를 보여 준다
  const pack = scene.category === "dev";
  const allVoice = useVoice();
  const packVoice = usePackVoice();
  const voice = pack ? packVoice : allVoice;
  const { open: openInquiry, element: inquiry } = useInquiry();
  // 오늘 처음 이어졌으면 연속 기록을 먼저 보여주고, 새 물건은 그 뒤에 들어온다
  const streakShown = useRef(false);
  const playStreak = useEffectEvent(() => {
    if (!streak || streakShown.current) return;
    streakShown.current = true;
    sfx.streak((streakAt + 120) / 1000);
  });
  useEffect(() => playStreak(), [streak]);
  return (
    <div className="animate-rise">
      {/* 끝났다는 말을 크게 두면 화면을 닫는 신호로 읽혀서(첫 방문 9명 중 2명이 여기서 나감), 다음 장면이 있으면 그 예고를 맨 위 주인공으로 둔다.
          예고는 엔딩 컷을 본 뒤 올라오되, 자리는 미리 잡아 두어 아래 카드가 밀려 내려가지 않게 한다 */}
      {/* 판을 끝낸 장면에서는 결과 장이 주인공이다. 엔딩 컷을 본 뒤에 올라오고, 다음 판의 첫 질문은 그 아래로 내려간다 */}
      {/* 세 장면 중 어디까지 왔고 끝에 무엇이 나오는지. 기다리지 않고 바로 보여서, 무대에서 엔딩 컷이 도는 동안에도 이 칸이 비어 있지 않다 */}
      {runOn && !runDone && run.scenes.length < RUN_SIZE && <RunSteps done={run.scenes.length} />}
      {runDone && (
        <section aria-label="영어 말투 보고서" aria-busy={!askShown} className="mb-6">
          {askShown ? (
            <div className="animate-fade">
              <RunResult run={run} onShare={() => shareRun()} shareState={runShareState} />
              <FeatureDetour order={order} current={scene.id} />
            </div>
          ) : (
            <RunResultWaiting reduced={reduced} onSkip={() => setAskShown(true)} />
          )}
        </section>
      )}
      {/* 방금 끝낸 장면의 발견(한 줄 정리와 배운 표현)을 먼저 보여 주어 성취감을 남긴다 */}
      <section aria-label="오늘의 발견">
        <div className="flex items-end gap-2.5">
          <Mascot scale={2} className="shrink-0" />
          <p className="pb-0.5 font-label text-ui text-fg">{scene.title}에서 건진 말</p>
        </div>
        <div className="blk-frame mt-2.5">
          <div className="blk bg-card-raised px-4 py-4 text-ink">
            <p className="text-ui leading-[1.6]">{scene.discovery}</p>
            <ul className="mt-3.5 space-y-3 border-t-2 border-dashed border-ink/20 pt-3">
              {pairs.map((p) => (
                <li key={p.right}>
                  <p className="font-line text-say leading-snug">{p.right}</p>
                  <p className="mt-0.5 text-meta leading-snug text-ink-subtle">
                    {whenSaying(p.intent)} <s className="decoration-rust decoration-2">{p.wrong}</s> 말고
                  </p>
                </li>
              ))}
            </ul>
            <Link href="/expressions" className="-mx-1 mt-2 flex min-h-11 items-center gap-2 px-1 text-meta text-ink-subtle hover:text-ink">
              표현 모음에 담았어요
              <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* 다음 장면 예고. Mochi를 중복으로 띄우지 않고 깔끔한 예고 카드로 잇는다 */}
      {nextAsk && !askShown ? (
        <button type="button" onClick={() => setAskShown(true)} aria-label="다음 장면 바로 보기" className="mt-5 block w-full text-left">
          <span className="flex items-center gap-2 text-note text-fg-subtle">
            다음 장면
            {!runDone && <WaitDots reduced={reduced} />}
          </span>
          <span aria-hidden className="mt-2 flex gap-3 border-2 border-line/50 bg-surface/60 p-2.5">
            <span className="aspect-[4/3] w-24 shrink-0 bg-surface-strong" />
            <span className="flex-1 space-y-2 pt-1">
              <span className="block h-5 w-2/3 bg-surface-strong" />
              <span className="block h-4 w-4/5 bg-surface" />
            </span>
          </span>
        </button>
      ) : nextAsk ? (
        <section aria-label="다음 장면" className="mt-5 animate-fade">
          <p className="text-note text-fg-subtle">다음 장면</p>
          <EntryLink href={`/scenes/${nextAsk.number}`} entry="next" onClick={onNext} className="blk-btn mt-2 block">
            <span className="blk flex gap-3 bg-card-raised p-2.5 text-ink">
              <SceneThumb stage={nextAsk.stage} className="aspect-[4/3] w-24 shrink-0 border-2 border-line" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-bold leading-snug">{nextAsk.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-meta text-ink-subtle">
                  <MapPin />
                  <span className="truncate">{nextAsk.place}</span>
                </span>
                <span className="mt-1.5 line-clamp-2 block font-line text-ui leading-snug">
                  <span className="mr-1 font-label text-meta text-ink-subtle">{nextAsk.partnerName}</span>
                  {nextAsk.partnerLine}
                </span>
              </span>
            </span>
          </EntryLink>
          <ThumbStudio />
        </section>
      ) : null}

      {/* 알림 제안은 한 판(3장면)을 끝냈거나 단독 장면일 때만 띄워 1·2화 사이의 흐름을 끊지 않는다 */}
      {nextAsk && askShown && (!runOn || runDone) && onPushShown && onPushSubscribed && (
        <PushOffer partnerName={nextAsk.partnerName} onShown={onPushShown} onSubscribed={onPushSubscribed} />
      )}

      {/* 방금 고른 답까지 반영한 "내 영어 말투" 한 줄. 판으로 세는 장면에서는 결과 장이 이 자리를 맡아서, 판이 끝나기 전에 미리 보여 주지 않는다 */}
      {!runOn && <Link href="/me" className="-mx-1 mt-3 flex min-h-11 items-center justify-between gap-3 px-1 hover:text-fg">
        <span className="min-w-0">
          <span className="block text-meta text-fg-subtle">{pack ? "내 리뷰 말투" : "내 영어 말투"}</span>
          <span className={`block text-ui ${voice.answered >= VOICE_MIN ? "font-bold text-fg" : "text-fg-muted"}`}>{voice.headline}</span>
        </span>
        <Arrow />
      </Link>}

      {/* 연속 기록과 새 물건은 발견 뒤에 작게 덧붙인다 */}
      {(streak || granted.length > 0) && (
        <div className="mt-4 space-y-2">
          {streak && <StreakMomentCard current={streak.current} newBadge={streak.newBadge} reduced={reduced} delay={streakAt} />}
          {granted.length > 0 && <RewardReveal items={granted} sceneTitle={scene.title} reduced={reduced} onShown={onRewardShown} after={rewardAt - STREAK_DELAY} />}
        </div>
      )}

      {!runDone && <div className="blk mt-5 flex items-center gap-3 bg-surface-strong px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-label text-ui text-fg">{replying ? "친구에게 내 답 보여 주기" : "친구는 뭐라고 할까?"}</p>
          <p className="text-note text-fg-subtle">{replying ? "친구가 열면 내 첫 답과 비교해요" : "친구가 고르면 내 첫 답이 공개돼요"}</p>
        </div>
        <BlockButton onClick={share} className="shrink-0" faceClassName="font-label text-ui text-ink">
          {shareState === "copied" ? "복사됨" : shareState === "failed" ? "복사 실패" : replying ? "답장하기" : "문제 내기"}
        </BlockButton>
      </div>}

      <button type="button" onClick={onBack} className="-mx-1 mt-4 flex min-h-11 items-center gap-2 px-1 font-label text-ui text-fg-muted hover:text-fg">
        <span className="-scale-x-100">
          <Arrow />
        </span>
        다른 말 다시 보기
      </button>
      {/* 판정이나 영어가 이상하면 그 장면에서 바로 알린다. 문의 창이 보던 장면 주소를 함께 보낸다 */}
      <button type="button" onClick={() => openInquiry("scene")} className="-mx-1 flex min-h-11 items-center px-1 text-note text-fg-subtle underline underline-offset-4 hover:text-fg">
        이 장면의 영어가 이상해요
      </button>
      {inquiry}
    </div>
  );
}
