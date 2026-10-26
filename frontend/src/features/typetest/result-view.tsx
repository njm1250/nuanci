"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BlockButton, BlockLink, Panel } from "@/features/scene/block-ui";
import { sfx } from "@/features/scene/sfx";
import { useShare } from "@/features/scene/use-scene-flow";
import { characterDataUrl } from "./characters";
import { answersOf, chosen, decodePicks, type TestQuestion } from "./model";
import { stampKind } from "./stamps";
import { markSeen, saveFriend, useFriend, useMine, useSeen } from "./storage";
import { StampRow } from "./test-flow";
import { trackTest } from "./track";
import { ingredients, pairLine, TYPE_IDS, TYPES, type TypeId } from "./types";

// 유형별 인원이 이만큼은 모여야 "전체 중 N%"를 보여준다. 몇 명 안 될 때 비율은 의미가 없다
const MIN_PEOPLE = 30;

// 결과 주소 하나로 내 결과·친구 결과·유형 구경을 모두 보여준다.
// 주소의 답 기록이 이 기기에 남은 내 기록과 같으면 내 결과, 다르면 친구가 보낸 결과, 답 기록이 없으면 도감에서 연 유형 소개
export function ResultView({ type, questions, version }: { type: TypeId; questions: TestQuestion[]; version: string }) {
  const params = useSearchParams();
  const code = params.get("p");
  const sameSet = params.get("v") === version;
  const picks = sameSet ? decodePicks(code, questions) : null;
  const avg = Number(params.get("t")) || null;
  const mine = useMine();
  const myPicks = mine && mine.version === version ? decodePicks(mine.picks, questions) : null;
  const own = mine !== null && mine.type === type && code === mine.picks && sameSet;
  const mode = own ? "mine" : code ? "friend" : "browse";
  const rarity = useRarity(type);

  useEffect(() => {
    if (mode !== "friend") return;
    markSeen(type);
    saveFriend({ type, picks: code, version: params.get("v") });
    trackTest("test_result_viewed", { choiceId: type, entry: "share" });
  }, [mode, type]); // eslint-disable-line react-hooks/exhaustive-deps

  // 방금 테스트를 끝내고 들어온 거면 카드가 튀어나오며 소리가 난다. 새로 고침하면 다시 울리지 않는다
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("nuanci.test.fresh") !== "1") return;
      sessionStorage.removeItem("nuanci.test.fresh");
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFresh(true);
    sfx.reward(0.1);
  }, []);

  const t = TYPES[type];
  const answers = picks ? answersOf(questions, picks) : null;
  const friendInStore = mode === "mine" ? <FriendCompare me={type} myPicks={picks} /> : null;

  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep">
      <main className="w-full max-w-[480px] bg-night px-4 pb-12">
        <header className="flex h-12 items-center gap-2 font-pixel text-[15px]">
          <Link href="/" className="-ml-2 flex h-11 items-center px-2">
            <span className="hl">nuanci</span>
          </Link>
          <Link href="/test" className="text-paper-muted">
            영어 사고 유형 테스트
          </Link>
        </header>

        <p className="mt-2 font-pixel text-[15px] text-paper-subtle">{mode === "mine" ? "나의 영어 사고 유형" : mode === "friend" ? "친구의 영어 사고 유형" : "영어 사고 유형"}</p>
        <TypeCard type={type} kinds={answers?.map((a) => stampKind(a.verdict)) ?? null} avg={avg} rarity={rarity} pop={fresh} className="mt-2" />

        {/* 결과를 보자마자 보낼 수 있게 카드 바로 아래에 둔다 */}
        {mode === "mine" && <Share type={type} />}

        {mode === "friend" && (
          <div className="mt-5">
            {myPicks && mine ? (
              <Compare me={mine.type} friend={type} same={picks ? countSame(myPicks, picks) : null} total={questions.length} />
            ) : (
              <BlockLink href="/test" primary>
                나도 테스트하기 · 5문제
              </BlockLink>
            )}
          </div>
        )}

        {answers && <Ingredients mix={ingredients(answers)} name={t.name} />}

        <Panel className="mt-5">
          <div className="px-4 py-3.5">
            <p className="text-[15px] leading-relaxed">{t.about}</p>
            <p className="mt-3 border-t-[3px] border-dotted border-ink/20 pt-3 font-pixel text-[15px] text-ink-subtle">고치는 한 줄</p>
            <p className="mt-1 text-[15px] leading-relaxed">{t.fix}</p>
          </div>
        </Panel>

        {mode === "mine" && picks && (
          <>
            {friendInStore}
            <Review questions={questions} picks={picks} />
          </>
        )}

        <div className="mt-6 space-y-3">
          {mode === "mine" && picks ? <WorstScene questions={questions} picks={picks} /> : null}
          {mode === "browse" && (
            <BlockLink href="/test" primary>
              나는 무슨 유형인지 테스트하기
            </BlockLink>
          )}
          <BlockLink href="/scenes" entry="home">
            본편: 장면 플레이하러 가기
          </BlockLink>
          {mode === "mine" && (
            <Link href="/test" className="flex min-h-11 items-center justify-center text-[14px] text-paper-muted underline underline-offset-4">
              테스트 다시 하기
            </Link>
          )}
        </div>

        <Collection current={type} />
      </main>
    </div>
  );
}

function useRarity(type: TypeId) {
  const [share, setShare] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/test/types")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { total: number; types: Record<string, number> } | null) => {
        if (alive && s && s.total >= MIN_PEOPLE) setShare(Math.max(1, Math.round(((s.types[type] ?? 0) / s.total) * 100)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [type]);
  return share;
}

const countSame = (a: number[], b: number[]) => a.filter((p, i) => p > 0 && p === b[i]).length;

// 수집 카드처럼 생긴 유형 카드. 결과 화면과 결과 주소의 첫 화면(답 기록을 읽기 전)이 같이 쓴다
export function TypeCard({ type, kinds, avg, rarity, pop = false, className = "" }: { type: TypeId; kinds: ReturnType<typeof stampKind>[] | null; avg: number | null; rarity: number | null; pop?: boolean; className?: string }) {
  const t = TYPES[type];
  return (
    <Panel className={`${pop ? "animate-[reward-pop_520ms_steps(6,end)_both]" : ""} ${className}`}>
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center justify-between font-pixel text-[15px] text-ink-subtle">
          <span>No.{String(t.no).padStart(2, "0")}</span>
          {rarity !== null && <span className="bg-ink px-1.5 py-1 text-[12px] leading-none text-paper">전체 참여자 중 {rarity}%</span>}
        </div>
        <div className="mt-2 grid place-items-center border-[3px] border-ink bg-[linear-gradient(var(--color-night-deep)_2px,transparent_2px),linear-gradient(90deg,var(--color-night-deep)_2px,transparent_2px)] bg-[length:24px_24px] py-3 light:bg-[linear-gradient(#e4dfd3_2px,transparent_2px),linear-gradient(90deg,#e4dfd3_2px,transparent_2px)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={characterDataUrl(type)} width={192} height={192} alt={`${t.name} 캐릭터`} className="[image-rendering:pixelated]" />
        </div>
        <h1 className="mt-3 font-pixel-title text-[24px] leading-tight">
          <span className="hl">{t.name}</span>
        </h1>
        <p className="mt-1.5 text-[15px] leading-snug text-ink-subtle">{t.tagline}</p>
        <div className="mt-3 flex items-baseline gap-2.5">
          <span className="shrink-0 bg-ink px-1.5 py-1 font-pixel text-[12px] leading-none text-paper">자주 하는 말</span>
          <p className="font-line text-[20px] leading-snug">{t.says}</p>
        </div>
        {kinds && (
          <div className="mt-3.5 flex items-center justify-between">
            <StampRow kinds={kinds} total={kinds.length} size={26} />
            {avg ? <span className="font-pixel text-[15px] text-ink-subtle">평균 {(avg / 10).toFixed(1)}초</span> : null}
          </div>
        )}
      </div>
    </Panel>
  );
}

// 영양 성분표를 흉내 낸 사고 성분표. 다섯 답이 어떤 함정으로 이루어졌는지 비율로 보여준다
function Ingredients({ mix, name }: { mix: ReturnType<typeof ingredients>; name: string }) {
  return (
    <div className="mt-5 border-[3px] border-ink bg-card px-3.5 pb-2 pt-2.5 text-ink">
      <p className="font-pixel-title text-[24px] leading-none">사고 성분표</p>
      <p className="mt-1 border-b-[6px] border-ink pb-1.5 text-[12px]">1회 제공량 5문장 · {name}</p>
      <ul>
        {mix.map((m) => (
          <li key={m.key} className="flex items-center gap-3 border-b-2 border-ink py-1.5 text-[15px]">
            <span className="w-28 shrink-0 font-pixel">{m.label}</span>
            <span className="h-2.5 flex-1 border-2 border-ink">
              <span className="block h-full bg-ink" style={{ width: `${m.share}%` }} />
            </span>
            <span className="w-10 shrink-0 text-right font-pixel">{m.share}%</span>
          </li>
        ))}
      </ul>
      <p className="pt-1.5 text-[12px] text-ink-subtle">* 하루 권장 사고량은 정해져 있지 않습니다</p>
    </div>
  );
}

function Compare({ me, friend, same, total }: { me: TypeId; friend: TypeId; same: number | null; total: number }) {
  return (
    <Panel dark>
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-center gap-4">
          {[
            ["나", me],
            ["친구", friend],
          ].map(([who, id]) => (
            <div key={who} className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={characterDataUrl(id as TypeId)} width={72} height={72} alt="" className="[image-rendering:pixelated]" />
              <span className="mt-1 text-[12px] text-paper-subtle">{who}</span>
              <span className="font-pixel text-[15px]">{TYPES[id as TypeId].name}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[15px] leading-snug">{pairLine(me, friend)}</p>
        {same !== null && (
          <p className="mt-1 text-center font-pixel text-[15px] text-paper-subtle">
            같은 답 {same} / {total}
          </p>
        )}
      </div>
    </Panel>
  );
}

// 친구 링크로 들어와서 테스트를 끝냈으면 내 결과 아래에 친구와 나란히 놓는다
function FriendCompare({ me, myPicks }: { me: TypeId; myPicks: number[] | null }) {
  const friend = useFriend();
  if (!friend) return null;
  const theirs = friend.picks ? [...friend.picks].map(Number) : null;
  return (
    <div className="mt-5">
      <Compare me={me} friend={friend.type} same={myPicks && theirs && theirs.length === myPicks.length ? countSame(myPicks, theirs) : null} total={myPicks?.length ?? 5} />
    </div>
  );
}

function Share({ type }: { type: TypeId }) {
  const t = TYPES[type];
  const params = useSearchParams();
  const path = `/test/r/${type}?${params}`;
  const { state, share } = useShare(path, `나는 영어 사고 유형 '${t.name}'이래.\n"${t.tagline}"\n너는 무슨 사고 칠지 5문제로 맞혀 봐!`, () => trackTest("test_shared", { choiceId: type }));
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}${path}`);
      setCopied(true);
      trackTest("test_shared", { choiceId: type });
    } catch {}
  };
  return (
    <section className="mt-5">
      <p className="font-pixel text-[15px] text-paper-subtle">친구는 무슨 유형일까?</p>
      <div className="mt-2 space-y-3">
        <BlockButton primary onClick={share} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
          {state === "copied" ? "복사했어요! 친구에게 붙여 넣어 주세요" : "친구에게 보내기"}
        </BlockButton>
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`/test/r/${type}/story?${params}`}
            download={`nuanci-${type}.png`}
            onClick={() => trackTest("test_shared", { choiceId: type })}
            className="blk-btn block"
          >
            <span className="blk block bg-cream px-3 py-2.5 text-center font-pixel text-[15px] text-ink">스토리 이미지</span>
          </a>
          <button type="button" onClick={copy} className="blk-btn block">
            <span className="blk block bg-cream px-3 py-2.5 text-center font-pixel text-[15px] text-ink">{copied ? "복사됨" : "링크 복사"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// 내 답 다시 보기. 문제마다 상대 말, 내 답과 상대 속마음, 자연스러운 답을 보여주고 그 장면으로 이어 준다
function Review({ questions, picks }: { questions: TestQuestion[]; picks: number[] }) {
  const mine = chosen(questions, picks);
  return (
    <section className="mt-6">
      <p className="font-pixel text-[15px] text-paper-subtle">내 답 다시 보기</p>
      <ol className="mt-2 space-y-3">
        {questions.map((q, i) => {
          const c = mine[i];
          const good = q.choices.find((x) => x.verdict === "good");
          return (
            <li key={`${q.sceneId}-${q.step}`}>
              <Panel>
                <div className="px-3.5 py-3 text-[15px] leading-snug">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-pixel text-ink-subtle">
                      {i + 1}. {q.partnerName}
                    </span>
                    <StampRow kinds={[stampKind(c?.verdict ?? null)]} total={1} size={22} />
                  </div>
                  <p className="mt-1 font-line text-[18px]">{q.partnerLine}</p>
                  <p className="mt-2">
                    <span className="text-ink-subtle">내 답 </span>
                    {c ? <span className="font-line text-[18px]">{c.line}</span> : "시간 초과"}
                  </p>
                  {c && c.verdict !== "good" && <p className="mt-0.5 text-ink-subtle">→ {c.reaction}</p>}
                  {good && c?.id !== good.id && (
                    <p className="mt-2">
                      <span className="text-ink-subtle">자연스러운 말 </span>
                      <span className="font-line text-[18px]">{good.line}</span>
                    </p>
                  )}
                  <Link href={`/scenes/${q.sceneNumber}`} className="mt-2 inline-flex min-h-11 items-center font-pixel text-ink underline underline-offset-4">
                    {q.sceneTitle} 플레이 →
                  </Link>
                </div>
              </Panel>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// 가장 크게 사고 친 문제의 장면으로 바로 보내서 테스트가 본편으로 이어지게 한다
function WorstScene({ questions, picks }: { questions: TestQuestion[]; picks: number[] }) {
  const mine = chosen(questions, picks);
  const rank = (i: number) => (mine[i] === null ? 1 : mine[i]!.verdict === "bad" ? 2 : mine[i]!.verdict === "meh" ? 1 : 0);
  const worst = questions.map((_, i) => i).sort((a, b) => rank(b) - rank(a))[0];
  const q = questions[worst];
  if (rank(worst) === 0) return null;
  return (
    <BlockLink href={`/scenes/${q.sceneNumber}`} primary entry="home">
      사고 친 장면 직접 해 보기 · {q.sceneTitle}
    </BlockLink>
  );
}

// 사고 유형 도감. 내가 받았거나 친구 링크로 본 유형만 색이 들어오고, 나머지는 실루엣으로 남는다
function Collection({ current }: { current: TypeId }) {
  const seen = useSeen() ?? [];
  const found = new Set<TypeId>([...seen, current]);
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <p className="font-pixel text-[15px] text-paper-subtle">사고 유형 도감</p>
        <span className="font-pixel text-[15px] text-paper-subtle">
          {found.size} / {TYPE_IDS.length}
        </span>
      </div>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {TYPE_IDS.map((id) => {
          const open = found.has(id);
          const body = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={characterDataUrl(id, open ? undefined : "#c9c2b3")} width={64} height={64} alt="" className="[image-rendering:pixelated]" />
              <span className="mt-1 text-center text-[12px] leading-tight">{open ? TYPES[id].name : "???"}</span>
            </>
          );
          return (
            <li key={id}>
              {open ? (
                <Link href={`/test/r/${id}`} className={`flex flex-col items-center border-[3px] px-1 py-2 ${id === current ? "border-ink bg-card text-ink" : "border-transparent"}`}>
                  {body}
                </Link>
              ) : (
                <div className="flex flex-col items-center border-[3px] border-transparent px-1 py-2 text-paper-subtle">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[13px] leading-snug text-paper-subtle">친구에게 받은 결과 링크를 열면 그 유형이 도감에 모여요.</p>
    </section>
  );
}
