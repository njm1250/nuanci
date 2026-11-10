"use client";

import "./feature-art.css";
import { Stage } from "@/vendor/stageshow/stage";
import type { Script } from "@/vendor/stageshow/act";
import { Mark } from "@/features/collection/expression-book";
import { spoken, type ExpressionPair } from "@/features/collection/pairs";
import { Mascot } from "@/features/mascot/mascot";
import { RewardIcon } from "@/features/rewards/reward-icon";
import { SpeakerTag } from "@/features/scene/block-ui";
import { ReactionFace } from "@/features/scene/reaction-face";
import { TRAP_LABELS, type Choice } from "@/features/scene/types";
import { Num, VERDICTS, VerdictStamp } from "@/features/scene/verdict";

// 화면에 들어왔을 때 한 번만 움직이고 끝 장면에 멈춘다. 동작 줄이기 설정이면 처음부터 끝 장면(poster)만 그린다
const ONCE = { play: "once" as const };

type Talk = { phase: 0 | 1 | 2 | 3 };

const talkScript: Script<Talk> = async (a) => {
  await a.wait(900);
  await a.set({ phase: 1 });
  await a.wait(160);
  await a.set({ phase: 2 });
  await a.wait(900);
  await a.set({ phase: 3 });
  a.mark("stamp");
};

// 1화의 실제 질문 화면. 상대 대사 아래 보기 셋 중 사고 나는 말을 눌러, 결과 카드로 바뀌며 반응이 오르고 도장이 찍힌다
export function TalkArt({ partnerName, partnerLine, choices }: { partnerName: string; partnerLine: string; choices: Choice[] }) {
  const picked = choices.find((c) => c.verdict === "bad") ?? choices[0];
  return (
    <Stage<Talk> {...ONCE} className="feature-art art-talk" width={460} height={395} compact={{ below: 440, width: 358, height: 416 }} initial={{ phase: 0 }} poster={{ phase: 3 }} script={talkScript}>
      {({ phase }, _rect, layout) => (
        <div className={`absolute border-2 border-ink bg-card ${layout === "compact" ? "inset-x-4 top-4 p-3.5 pt-4" : "inset-x-7 top-7 p-4 pt-5"}`}>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2.5">
            <SpeakerTag>{partnerName}</SpeakerTag>
            <div className="border-l-[3px] border-ink pl-3 font-line text-say leading-snug">{partnerLine}</div>
          </div>
          <div className="mt-5 flex flex-col gap-3 bg-card">
            {choices.map((c, i) => {
              const mine = c.id === picked.id;
              const result = mine && phase >= 2;
              return (
                <div key={c.id} data-pressed={mine && phase === 1 ? "" : undefined} data-result={result ? "" : undefined} className="art-btn relative overflow-hidden bg-card">
                  {result && <span aria-hidden className={`absolute inset-0 opacity-15 ${VERDICTS[c.verdict].color}`} />}
                  {/* 고른 순간에만 판정 색이 한 번 번쩍인다. 끝 장면(poster)에는 남기지 않는다 */}
                  {mine && phase === 2 && <span aria-hidden className={`absolute inset-0 animate-tint ${VERDICTS[c.verdict].color}`} />}
                  <div className="relative flex items-start gap-3 px-3 py-2.5">
                    <Num n={i + 1} dark={result} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-line text-say leading-snug">{c.line}</span>
                        {mine && phase >= 3 && (
                          <span className="pt-1">
                            <VerdictStamp choice={c} pop />
                          </span>
                        )}
                      </div>
                      {/* 보기마다 한국어 뜻을 달고, 고른 보기는 그 자리에 상대 반응이 올라온다. 두 줄을 한 칸에 겹쳐 둬서 카드 높이가 흔들리지 않는다 */}
                      <div className="grid">
                        <span className={`col-start-1 row-start-1 mt-0.5 text-note leading-snug text-ink-subtle transition-opacity duration-fast ${result ? "opacity-0" : ""}`}>{c.meaning}</span>
                        {mine && (
                          <span
                            className={`col-start-1 row-start-1 flex items-start gap-2 pt-1.5 text-body font-bold leading-[1.5] ${result ? "animate-rise" : "invisible"}`}
                          >
                            <span className="mt-px">
                              <ReactionFace expression={c.expression} size={18} />
                            </span>
                            {c.reaction}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Stage>
  );
}

type Book = { phase: 0 | 1 | 2 };

const bookScript: Script<Book> = async (a) => {
  await a.wait(1000);
  await a.set({ phase: 1 });
  await a.wait(160);
  await a.set({ phase: 2 });
  a.mark("reveal");
};

// 표현 모음의 실제 한 칸. 영어를 가려 둔 채로 시작해서, 가린 칸을 누르면 자연스러운 말이 드러난다
export function BookArt({ title, pair, next }: { title: string; pair: ExpressionPair; next?: ExpressionPair }) {
  return (
    <Stage<Book> {...ONCE} className="feature-art art-book" width={460} height={300} compact={{ below: 440, width: 358, height: 290 }} initial={{ phase: 0 }} poster={{ phase: 2 }} script={bookScript}>
      {({ phase }, _rect, layout) => (
        <div className={`absolute border-2 border-ink bg-card ${layout === "compact" ? "inset-x-4 top-4" : "inset-x-7 top-7"}`}>
          <div className={`bg-card ${layout === "compact" ? "px-3.5 pt-4" : "px-5 pt-5"}`}>
            <div className="flex items-end border-b-2 border-fg">
              <span className="min-w-0 truncate bg-fg px-3 py-2 font-label text-ui leading-tight text-page">{title}</span>
            </div>
            <div className="px-3 py-4">
              <div className="text-note leading-snug text-ink-muted">{spoken(pair.intent)}</div>
              <div className="mt-1 flex items-start gap-2">
                <span className="mt-1">
                  <Mark good />
                </span>
                {phase < 2 ? (
                  <span
                    className={`flex min-h-9 flex-1 items-center border border-dashed border-line px-2 font-label text-ui text-ink-subtle transition-colors duration-press ${phase === 1 ? "bg-surface" : ""}`}
                  >
                    눌러서 보기
                  </span>
                ) : (
                  <span className="flex min-h-9 min-w-0 animate-rise items-center font-line text-say-lg leading-snug">{pair.right}</span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-note text-ink-subtle">
                <Mark good={false} />
                <s className="min-w-0 decoration-rust decoration-2">{pair.wrong}</s>
                {pair.trap && <span className="shrink-0 text-meta">· {TRAP_LABELS[pair.trap]}</span>}
              </div>
              <div className="mt-3.5 text-meta leading-relaxed text-ink-subtle">
                {pair.who} · {pair.when}
              </div>
            </div>
            {/* 같은 장면의 다음 표현은 자리만 보여 주고 무대 아래로 잘려 나간다 */}
            {next && (
              <div aria-hidden className="border-t border-line/40 px-3 py-4">
                <div className="h-2.5 w-[38%] bg-surface" />
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="size-5 shrink-0 bg-good/40" />
                  <span className="h-3.5 w-[62%] bg-surface-strong" />
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="size-5 shrink-0 bg-bad/40" />
                  <span className="h-2.5 w-[44%] bg-surface" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Stage>
  );
}

type Room = { phase: 0 | 1 };

const roomScript: Script<Room> = async (a) => {
  await a.wait(900);
  await a.set({ phase: 1 });
  a.mark("filled");
};

const OWNED = ["cap", "plant", "headphones"];
const NEW = "fishbowl";
const LOCKED = ["crown", "trophy", "cake", "mic", "camera", "lamp", "clock", "rug", "gamepad"];
const EXTRA = ["frame", "ramen", "flower", "dumbbell", "badge", "poster", "pudding", "beanie", "scarf", "bowtie", "glasses"];

// 아지트 아이템 칸. 장면을 끝내면 빈 칸 하나가 새 물건으로 채워지고, 옆에 선 Mochi가 콩콩 뛴다
export function RoomArt() {
  return (
    <Stage<Room> {...ONCE} className="feature-art art-room" width={460} height={215} compact={{ below: 440, width: 358, height: 158 }} initial={{ phase: 0 }} poster={{ phase: 1 }} script={roomScript}>
      {({ phase }, _rect, layout) => {
        const compact = layout === "compact";
        return (
          <>
            {/* 칸 목록은 오른쪽과 아래로 잘려 나가서, 아직 못 얻은 칸이 더 있다는 걸 그림으로 보여 준다 */}
            <div className={`absolute -right-24 border-2 border-ink bg-card ${compact ? "left-[110px] top-4 p-3" : "left-[132px] top-7 p-4"}`}>
              <div className={`grid ${compact ? "grid-cols-[repeat(6,46px)] gap-2" : "grid-cols-[repeat(6,58px)] gap-3"}`}>
                {[...OWNED, NEW, ...LOCKED, ...EXTRA].map((id, i) => {
                  const fresh = id === NEW;
                  const owned = OWNED.includes(id) || (fresh && phase === 1);
                  return (
                    <div key={`${id}-${i}`} className={`relative grid aspect-square place-items-center border-2 ${owned ? "border-ink bg-card" : "border-dashed border-line bg-surface"}`}>
                      {owned ? (
                        <span data-snap={fresh || undefined} className={fresh ? "animate-reward-pop" : ""}>
                          <RewardIcon id={id} size={compact ? 28 : 36} />
                        </span>
                      ) : (
                        <RewardIcon id={id} size={compact ? 28 : 36} className="opacity-30 [filter:brightness(0)]" />
                      )}
                      {/* 처음 보는 물건에는 진짜 아지트처럼 작은 점이 붙는다 */}
                      {fresh && phase === 1 && <span aria-hidden className="absolute left-1 top-1 size-2 animate-fade [animation-delay:200ms] bg-rust" />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={`absolute ${compact ? "bottom-4 left-3" : "bottom-6 left-5"}`}>
              <span data-snap className={`block ${phase === 1 ? "animate-hop-twice" : ""}`}>
                <Mascot scale={compact ? 5 : 6} />
              </span>
            </div>
          </>
        );
      }}
    </Stage>
  );
}
