"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { setAvatar } from "@/features/avatar/avatar";
import { place, putOn, takeOff, useHeroLook } from "@/features/rewards/hero-look";
import { RewardCard } from "@/features/rewards/reward-reveal";
import { RewardIcon } from "@/features/rewards/reward-icon";
import {
  COLOR_HEX,
  COLOR_LABELS,
  isUnopened,
  isUsable,
  lockHint,
  markAllRewardsSeen,
  nextGoalParts,
  ownedReason,
  setRewardColor,
  useRewards,
  type RewardItem,
} from "@/features/rewards/rewards";
import { EntryLink, Panel } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { sfx } from "@/features/scene/sfx";
import { useReducedMotion } from "@/features/scene/use-scene-flow";
import { Stage } from "@/features/stage/stage";
import type { Motion } from "@/features/scene/types";
import type { Hero } from "@/features/stage/types";
import { useAccount } from "./account";
import { GoogleButton } from "./google-button";

const noop = () => () => {};
const HERO_LABELS: Record<Hero, string> = { boy: "남자", girl: "여자" };

const TABS = [
  { id: "wear", label: "옷장" },
  { id: "room", label: "방 꾸미기" },
  { id: "log", label: "수집 기록" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const COLS = 5;

// 가까운 목표 순서: 장면 수가 적게 남은 것, 장소 묶음, 장면 기념품, 친구, 깜짝 상자
function lockOrder(item: RewardItem) {
  const lock = item.lock;
  if (!lock) return 900;
  if (lock.type === "milestone") return lock.remaining;
  if (lock.type === "bundle") return 100 + lock.remaining;
  return { scene: 300, share: 400, box: 500 }[lock.type];
}

function Check({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-current">
      <path d="M6 1h1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h1v1h1v1h1v-1h1v-1h1z" />
    </svg>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 아지트: 옷장에서 주인공을 꾸미고, 얻은 물건을 방에 두고, 무엇을 언제 얻었는지 돌아보는 곳.
// 아이템이 늘어도 화면이 길어지지 않게 작은 아이콘 칸으로 보여주고, 고른 아이템 하나만 아래 칸에서 자세히 보여준다.
// 모바일에서는 무대를 위에 고정해서 아이템을 바꾸는 동안 주인공과 방이 계속 보인다
export type SceneMemory = { number: number; title: string; right: string };

// 물건을 얻은 장면. 장면 기념품은 그 장면이고, 장면 수 보상은 그 수만큼째 끝낸 장면이다. 상자·묶음처럼 장면 하나로 정할 수 없으면 없다
function memoryScene(item: RewardItem, cleared: string[]) {
  const owned = item.owned;
  if (!owned) return null;
  if (owned.sceneId) return owned.sceneId;
  if (owned.reason === "milestone" && owned.count) return cleared[owned.count - 1] ?? null;
  return null;
}

// 아지트 무대에서 캐릭터를 누를 때마다 차례로 돌아가며 하는 동작과 말. 계속 반복되는 동작(춤·손 흔들기)은 멈추지 않아서 한 번 하고 끝나는 것만 쓴다
const ME_POKES: { motion: Motion; line: string }[] = [
  { motion: "bounce", line: "간지러워!" },
  { motion: "spin", line: "이 방 꽤 괜찮지?" },
  { motion: "nod", line: "오늘도 사고 치러 가 볼까?" },
  { motion: "tilt", line: "왜, 할 말 있어?" },
  { motion: "clap", line: "새 물건 또 받고 싶다!" },
];
const MOCHI_POKES: { motion: Motion; line: string }[] = [
  { motion: "bounce", line: "냥?" },
  { motion: "tilt", line: "골골골…" },
  { motion: "spin", line: "밥은?" },
  { motion: "nod", line: "건드리지 마라냥" },
];

export function RoomView({ memories }: { memories: Record<string, SceneMemory> }) {
  const cleared = useCleared();
  const [poke, setPoke] = useState<{ who: "me" | "partner"; n: number } | null>(null);
  const pokeStage = (who: "me" | "partner") => {
    sfx.tap();
    setPoke((p) => ({ who, n: (p?.n ?? -1) + 1 }));
  };
  const mePoke = poke?.who === "me" ? ME_POKES[poke.n % ME_POKES.length] : null;
  const mochiPoke = poke?.who === "partner" ? MOCHI_POKES[poke.n % MOCHI_POKES.length] : null;
  const account = useAccount();
  const rewards = useRewards();
  const look = useHeroLook();
  const { avatar } = look;
  const member = account.status === "member";
  // 완료 화면에서 방 물건을 보러 오면 방 꾸미기 탭부터 연다
  const linked = useSyncExternalStore(noop, () => new URLSearchParams(location.search).get("tab"), () => null);
  const [picked, setTab] = useState<Tab | null>(null);
  const tab: Tab = picked ?? (linked === "room" || linked === "log" ? linked : "wear");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(false);
  const [shownId, setShownId] = useState<string | null>(null);

  // 새 표시는 이 화면에 있는 동안 남기고, 떠날 때 본 것으로 남긴다
  useEffect(() => () => markAllRewardsSeen(), []);

  const items = rewards?.items ?? [];
  const reduced = useReducedMotion();
  const memoryOf = (r: RewardItem) => {
    const id = memoryScene(r, cleared);
    return id ? (memories[id] ?? null) : null;
  };
  const titleOf = (r: RewardItem) => (r.owned?.sceneId ? memories[r.owned.sceneId]?.title : undefined);
  const isOn = (r: RewardItem) => (r.kind === "wear" ? look.isWorn(r.id) : look.placed.includes(r.id));
  const selected = items.find((i) => i.id === selectedId && i.kind === (tab === "wear" ? "wear" : "room")) ?? null;

  const setOn = (r: RewardItem, on: boolean) => {
    if (r.kind === "wear") return setAvatar(on ? putOn(avatar, r, items) : takeOff(avatar, r), member);
    setAvatar(place(avatar, look.placed, r.id, on), member);
  };

  // 안 쓰던 아이템은 누르면 바로 쓰고, 쓰고 있는 아이템은 처음 누르면 골라서 색을 바꿀 수 있게 하고 한 번 더 누르면 벗는다
  const press = (r: RewardItem) => {
    setSelectedId(r.id);
    if (!isUsable(r)) return;
    if (!isOn(r)) setOn(r, true);
    else if (selectedId === r.id) setOn(r, false);
  };

  // 못 얻은 아이템은 가까운 목표부터 한 줄만 보여주고 나머지는 접어 둔다. 늘어나도 화면이 길어지지 않고 다음 목표가 먼저 보인다
  const locked = items.filter((i) => i.kind === tab && !isUsable(i)).sort((a, b) => lockOrder(a) - lockOrder(b));
  // 얻은 칸 뒤로 줄이 딱 맞게 채워질 만큼만 보여준다. 한 줄에 둘도 안 남으면 한 줄 더 보여준다
  const ownedCount = items.filter((i) => i.kind === tab && isUsable(i)).length;
  const fill = COLS - (ownedCount % COLS);
  const preview = fill < 3 ? fill + COLS : fill;
  const log = items.filter(isUsable).sort((a, b) => b.owned!.grantedAt.localeCompare(a.owned!.grantedAt));
  // 장면 완료 화면에서 열지 않고 넘어간 상자는 여기서 하나씩 연다. 여러 개여도 한 칸만 쓰고, 연 물건 카드는 닫으면 다음 상자가 나온다
  const unopened = items.filter(isUnopened);
  const shown = items.find((i) => i.id === shownId && !isUnopened(i)) ?? null;
  const closeShown = () => {
    if (!shown) return;
    // 닫으면 그 물건이 들어간 칸을 골라서 어디에 생겼는지 보여준다
    setTab(shown.kind === "wear" ? "wear" : "room");
    setSelectedId(shown.id);
    setShownId(null);
  };
  const next = rewards?.next;

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_400px] md:items-start md:gap-10">
      <div className="sticky top-[var(--header-shown)] z-10 -mx-4 bg-page px-4 pb-3 transition-[top] duration-base ease-out md:top-[calc(var(--header-shown)+1.5rem)] md:mx-0 md:bg-transparent md:px-0">
        <Panel>
          <div className="relative aspect-[4/3] max-h-[32dvh] w-full overflow-hidden md:max-h-none">
            <Stage
              spec={{ set: "room", time: "day", partner: "mochi", hero: look.hero, wear: look.wear, flags: [`books-${cleared.length}`, ...look.placed] }}
              state={{
                meMotion: mePoke?.motion,
                meKey: mePoke ? poke!.n : 0,
                partnerMotion: mochiPoke?.motion ?? "idle",
                partnerKey: mochiPoke ? poke!.n : 0,
                talkKey: mePoke ? poke!.n : 0,
                reaction: null,
                // 누른 캐릭터만 말한다. 아무도 안 눌렀으면 주인공이 아지트를 소개한다
                meLine: mochiPoke ? undefined : (mePoke?.line ?? "여기가 내 아지트야!"),
                partnerLine: mochiPoke?.line,
              }}
              onPick={pokeStage}
            />
            {next && (
              <p className="absolute bottom-2 left-2 bg-ink px-2 py-1 font-label text-ui leading-none text-fg">
                {nextGoalParts(next)[0]}
                <span className="mx-0.5 bg-white px-1 font-bold text-ink">{nextGoalParts(next)[1]}</span>
                {nextGoalParts(next)[2]}
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-3 md:mt-0">
        {shown ? (
          <div className="mb-5">
            <RewardCard key={shown.id} item={shown} reduced={reduced} onClose={closeShown} />
          </div>
        ) : (
          unopened.length > 0 && (
            <div className="mb-5">
              <RewardCard key={unopened[0].id} item={unopened[0]} reduced={reduced} stacked={unopened.length > 1} onOpened={setShownId} />
            </div>
          )
        )}

        <div role="tablist" aria-label="아지트" className="grid grid-cols-3 border-2 border-fg-subtle/40">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => (setTab(t.id), setShowLocked(false))}
              className={`min-h-11 font-label text-ui ${tab === t.id ? "bg-fg text-page" : "text-fg-muted hover:text-fg"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-4">
          {tab === "wear" && (
            <div className="mb-4 flex items-center gap-3">
              <span id="hero-label" className="font-label text-ui text-fg-muted">
                주인공
              </span>
              <div role="group" aria-labelledby="hero-label" className="grid flex-1 grid-cols-2 border-2 border-fg-subtle/40">
                {(["girl", "boy"] as const).map((hero) => (
                  <button
                    key={hero}
                    type="button"
                    onClick={() => setAvatar({ ...avatar, hero }, member)}
                    aria-pressed={avatar.hero === hero}
                    className={`min-h-11 font-label text-ui ${avatar.hero === hero ? "bg-fg text-page" : "text-fg-muted hover:text-fg"}`}
                  >
                    {HERO_LABELS[hero]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab !== "log" && (
            <>
              {selected && <Detail item={selected} on={isOn(selected)} setOn={(on) => setOn(selected, on)} title={titleOf(selected)} memory={memoryOf(selected)} />}
              <ul className="grid grid-cols-5 gap-2">
                {[...items.filter((i) => i.kind === tab && isUsable(i)), ...(showLocked ? locked : locked.slice(0, preview))].map((r) => (
                  <li key={r.id}>
                    <Tile item={r} on={isUsable(r) && isOn(r)} selected={selected?.id === r.id} onPress={() => press(r)} />
                  </li>
                ))}
              </ul>
              {locked.length > preview && (
                <button
                  type="button"
                  onClick={() => setShowLocked((v) => !v)}
                  aria-expanded={showLocked}
                  className="-mx-1 mt-2 flex min-h-11 items-center gap-2 px-1 font-label text-ui text-fg-muted underline underline-offset-4"
                >
                  {showLocked ? "접기" : "잠긴 칸 더 보기"}
                </button>
              )}
            </>
          )}

          {tab === "log" &&
            (log.length === 0 ? (
              <p className="text-note leading-relaxed text-fg-muted">장면을 끝내면 얻은 물건이 여기에 하나씩 쌓여요.</p>
            ) : (
              <ul className="divide-y-2 divide-surface">
                {log.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2">
                    <span className="grid size-10 shrink-0 place-items-center bg-surface">
                      <RewardIcon id={r.id} color={r.owned!.color} size={28} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-label text-ui text-fg">{r.name}</span>
                      <span className="block truncate text-meta text-fg-subtle">{ownedReason(r.owned!, titleOf(r))}</span>
                      {memoryOf(r) && <span className="mt-0.5 block truncate text-note text-fg-muted">“{memoryOf(r)!.right}”</span>}
                    </span>
                    <span className="shrink-0 text-meta text-fg-subtle">{formatDate(r.owned!.grantedAt)}</span>
                  </li>
                ))}
              </ul>
            ))}
        </div>

        {!member && account.status !== "loading" && (
          <Panel className="mt-6">
            <div className="p-4">
              <p className="text-body font-bold">로그인하고 계정에 남기기</p>
              <p className="mt-1 text-meta leading-relaxed text-ink-subtle">꾸민 모습과 모은 물건이 다른 기기에서도 그대로예요.</p>
              <GoogleButton next="/me/room" enabled={account.google} />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

// 아이템 한 칸. 켠 상태는 누르는 색(핑크) 바탕과 체크로, 얻은 물건은 먹선 칸, 못 얻은 칸은 점선으로 나눈다. 처음 보는 물건은 점으로, 못 얻은 아이템은 그림자와 얻는 조건으로 보여준다
function Tile({ item, on, selected, onPress }: { item: RewardItem; on: boolean; selected: boolean; onPress: () => void }) {
  const usable = isUsable(item);
  const box = isUnopened(item);
  const label = usable ? item.name! : `잠긴 아이템, ${item.lock ? lockHint(item.lock) : "깜짝 상자"}`;
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      aria-pressed={usable ? on : undefined}
      className={`relative flex aspect-square w-full flex-col items-center justify-center gap-1 border-2 px-1 ${on ? "border-ink bg-cta text-cta-text" : usable ? "border-ink bg-card-raised text-ink hover:bg-surface" : "border-dashed border-line bg-surface text-fg-subtle"} ${selected ? "outline outline-[3px] outline-offset-2 outline-fg" : ""}`}
    >
      {/* 못 얻은 물건은 그림자만 보여주고 얻는 조건을 적는다. 열지 않은 상자는 무엇이 들었는지 감춘다 */}
      <RewardIcon
        id={usable ? item.id : box ? "box" : item.id}
        color={item.owned?.color}
        size={28}
        className={usable || box ? "" : "opacity-30 [filter:brightness(0)_invert(1)] light:[filter:brightness(0)]"}
      />
      <span aria-hidden className="w-full truncate text-center text-meta leading-tight">
        {usable ? item.name : box ? "상자" : item.lock ? lockHint(item.lock) : "???"}
      </span>
      {on && (
        <span aria-hidden className="absolute right-1 top-1">
          <Check size={10} />
        </span>
      )}
      {usable && !item.owned!.seen && <span aria-hidden className="absolute left-1 top-1 size-2 bg-rust" />}
    </button>
  );
}

// 고른 아이템의 이름과 얻은 까닭(못 얻었으면 조건), 쓰기·두기 토글과 색, 그리고 얻은 장면에서 배운 말. 아이템을 고를 때만 나온다
function Detail({
  item,
  on,
  setOn,
  title,
  memory,
}: {
  item: RewardItem;
  on: boolean;
  setOn: (on: boolean) => void;
  title?: string;
  memory: SceneMemory | null;
}) {
  const usable = isUsable(item);
  return (
    <div className="blk mb-3 flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 bg-surface px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-label text-ui text-fg">{usable ? item.name : "???"}</p>
        <p className="truncate text-meta text-fg-subtle">
          {usable ? ownedReason(item.owned!, title) : item.lock ? lockHint(item.lock) : "깜짝 상자"}
        </p>
      </div>
      {usable && item.colors.length > 0 && (
        <div role="radiogroup" aria-label={`${item.name} 색`} className="flex">
          {item.colors.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={item.owned!.color === c}
              aria-label={COLOR_LABELS[c]}
              onClick={() => setRewardColor(item.id, c)}
              className={`grid size-11 place-items-center border-[3px] ${item.owned!.color === c ? "border-fg" : "border-transparent"}`}
            >
              <span className="grid size-6 place-items-center text-fg" style={{ background: COLOR_HEX[c] }}>
                {item.owned!.color === c && <Check size={10} />}
              </span>
            </button>
          ))}
        </div>
      )}
      {usable && (
        <button
          type="button"
          onClick={() => setOn(!on)}
          aria-pressed={on}
          className={`blk flex min-h-11 items-center gap-1.5 px-3 font-label text-ui ${on ? "bg-fg text-page" : "bg-surface-strong text-fg"}`}
        >
          {item.kind === "wear" ? "쓰기" : "두기"}
          {on && <Check size={12} />}
        </button>
      )}
      {usable && memory && (
        <div className="flex basis-full items-center gap-3 border-t-2 border-page pt-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-meta text-fg-subtle">「{memory.title}」에서 배운 말</p>
            <p className="truncate text-note font-semibold text-fg">{memory.right}</p>
          </div>
          <EntryLink href={`/scenes/${memory.number}`} entry="home" className="flex min-h-11 shrink-0 items-center gap-1.5 px-1 font-label text-ui text-fg-muted underline underline-offset-4">
            다시 하기
          </EntryLink>
        </div>
      )}
    </div>
  );
}
