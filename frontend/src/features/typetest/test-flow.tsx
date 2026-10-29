"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mochiSvg } from "@/features/mascot/mochi";
import { BlockButton, Panel, SpeakerTag } from "@/features/scene/block-ui";
import { primeAudio, sfx } from "@/features/scene/sfx";
import { useReducedMotion } from "@/features/scene/use-scene-flow";
import { characterDataUrl } from "./characters";
import { QUESTION_MS, resultPath, type TestChoice, type TestQuestion } from "./model";
import { STAMP_COLORS, STAMP_LABELS, stampPath, stampKind, type StampKind } from "./stamps";
import { readFriend, saveMine, useFriend, useMine, type Friend, type Mine } from "./storage";
import { trackTest } from "./track";
import { scoreType, TYPE_IDS, TYPES, type Answer } from "./types";

type Picked = { choice: TestChoice | null; ms: number };

// 영어 사고 유형 테스트: 소개 → 순발력 5문제 → '분석 중' → 결과 주소로 이동
export function TestFlow({ questions, version }: { questions: TestQuestion[]; version: string }) {
  const [stage, setStage] = useState<"intro" | "play" | "analyze">("intro");
  const [relaxed, setRelaxed] = useState(false);
  const friend = useFriend();
  const mine = useMine();
  const [picked, setPicked] = useState<Picked[]>([]);

  useEffect(() => {
    trackTest("test_viewed", { entry: readFriend() ? "share" : "direct" });
  }, []);

  const start = () => {
    primeAudio();
    setPicked([]);
    setStage("play");
    trackTest("test_started", { entry: friend ? "share" : "direct" });
  };

  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep">
      <main className="flex min-h-dvh w-full max-w-[480px] flex-col bg-night px-4 pb-8">
        <header className="flex h-12 shrink-0 items-center gap-2 font-pixel text-[15px]">
          <Link href="/" className="-ml-2 flex h-11 items-center px-2">
            <span className="hl">nuanci</span>
          </Link>
          <span className="text-paper-muted">영어 사고 유형 테스트</span>
        </header>
        {stage === "intro" && <Intro friend={friend} mine={mine} relaxed={relaxed} onRelaxed={setRelaxed} onStart={start} count={questions.length} />}
        {stage === "play" && (
          <Play
            questions={questions}
            relaxed={relaxed}
            picked={picked}
            onPick={(p) => setPicked((prev) => [...prev, p])}
            onDone={() => setStage("analyze")}
          />
        )}
        {stage === "analyze" && <Analyze questions={questions} picked={picked} version={version} friend={friend} />}
      </main>
    </div>
  );
}

function Intro({ friend, mine, relaxed, onRelaxed, onStart, count }: { friend: Friend | null; mine: Mine | null; relaxed: boolean; onRelaxed: (v: boolean) => void; onStart: () => void; count: number }) {
  return (
    <section className="flex flex-1 flex-col pt-4">
      <p className="font-pixel text-[15px] text-paper-subtle">
        {count}문제 · 문제당 {QUESTION_MS / 1000}초
      </p>
      <h1 className="mt-2 font-pixel-title text-[24px] leading-[1.35]">
        영어로 말할 때 나는
        <br />
        <span className="hl">어떤 사고</span>를 칠까?
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-paper-muted">상대가 한 말에 바로 대답해 보세요. 고른 답에 숨은 함정으로 9가지 사고 유형 중 하나가 나와요.</p>

      {friend && (
        <Panel className="mt-5">
          <div className="flex items-center gap-3 px-3 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={characterDataUrl(friend.type)} width={48} height={48} alt="" className="shrink-0 [image-rendering:pixelated]" />
            <p className="text-[15px] leading-snug">
              친구는 <b>{TYPES[friend.type].name}</b>이었어요.
              <br />
              <span className="text-ink-subtle">같은 문제로 붙어 볼래요?</span>
            </p>
          </div>
        </Panel>
      )}

      {/* 9가지 유형이 모두 이 고양이(Mochi)의 변신이라는 걸 먼저 보여줘서 결과 캐릭터를 기대하게 만든다 */}
      <ul className="mt-6 grid grid-cols-3 gap-2" aria-label="9가지 사고 유형">
        {TYPE_IDS.map((id, i) => (
          <li key={id} className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={characterDataUrl(id)}
              width={72}
              height={72}
              alt=""
              className="animate-[bob_1.2s_steps(2,jump-none)_infinite] [image-rendering:pixelated]"
              style={{ animationDelay: `${(i % 3) * 200 + Math.floor(i / 3) * 100}ms` }}
            />
            <span className="mt-1 text-center text-[12px] leading-tight text-paper-subtle">{TYPES[id].name}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <BlockButton primary onClick={onStart} className="w-full" faceClassName="py-3.5 text-center font-pixel text-[15px]">
          {friend ? "나도 테스트하기" : "테스트 시작"}
        </BlockButton>
        <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 text-[14px] text-paper-muted">
          <input type="checkbox" checked={relaxed} onChange={(e) => onRelaxed(e.target.checked)} className="size-4 accent-current" />
          느긋하게 풀기 (시간 제한 없이)
        </label>
        {mine && (
          <Link href={resultPath(mine.type, [...mine.picks].map(Number), mine.version, mine.avg)} className="flex min-h-11 items-center justify-center text-[14px] text-paper-muted underline underline-offset-4">
            내 결과 다시 보기 · {TYPES[mine.type].name}
          </Link>
        )}
      </div>
    </section>
  );
}

// 문제 줄 위의 다섯 칸. 푼 문제에는 O·△·X·시계 도장이 찍힌다
export function StampRow({ kinds, total, size = 28 }: { kinds: StampKind[]; total: number; size?: number }) {
  return (
    <ol className="flex gap-1.5" aria-label={`${kinds.length}/${total}문제`}>
      {Array.from({ length: total }, (_, i) => {
        const kind = kinds[i];
        return (
          <li
            key={i}
            className={`grid place-items-center border-2 ${kind ? "border-ink animate-[stamp_280ms_steps(4,end)_both]" : "border-dashed border-paper-subtle"}`}
            style={{ width: size, height: size, background: kind ? STAMP_COLORS[kind] : undefined }}
          >
            {kind && (
              <svg width={size - 10} height={size - 10} viewBox="0 0 7 7" shapeRendering="crispEdges" role="img" aria-label={STAMP_LABELS[kind]}>
                <path className="fill-ink" d={stampPath(kind)} />
              </svg>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Play({ questions, relaxed, picked, onPick, onDone }: { questions: TestQuestion[]; relaxed: boolean; picked: Picked[]; onPick: (p: Picked) => void; onDone: () => void }) {
  const index = Math.min(picked.length, questions.length - 1);
  const q = questions[index];
  // 방금 고른 답. 도장과 상대 속마음을 잠깐 보여준 뒤 다음 문제로 넘어간다
  const [shown, setShown] = useState<Picked | null>(null);
  const startedAt = useRef(0);
  // 이 문제에 이미 답했는지. 시간 초과와 누르기가 겹치거나 두 번 불려도 답은 한 번만 남긴다
  const answered = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    startedAt.current = performance.now();
    answered.current = false;
  }, [index]);

  const answer = (choice: TestChoice | null) => {
    if (answered.current) return;
    answered.current = true;
    const p = { choice, ms: Math.round(performance.now() - startedAt.current) };
    setShown(p);
    if (choice) sfx[choice.verdict]();
    else sfx.meh();
    trackTest("test_answered", { sceneId: q.sceneId, step: q.step, choiceId: choice?.id });
    // 웃긴 반응을 읽을 시간은 주되 순발력 흐름이 끊기지 않게: 자연스러운 답은 짧게, 사고는 조금 길게
    const wait = reduced ? 900 : choice?.verdict === "good" ? 1100 : 1700;
    window.setTimeout(() => {
      onPick(p);
      setShown(null);
      if (picked.length + 1 >= questions.length) onDone();
    }, wait);
  };

  const kinds = [...picked.map((p) => stampKind(p.choice?.verdict ?? null)), ...(shown ? [stampKind(shown.choice?.verdict ?? null)] : [])];

  return (
    <section className="flex flex-1 flex-col pt-2">
      <div className="flex items-center justify-between">
        <StampRow kinds={kinds} total={questions.length} />
        <span className="font-pixel text-[15px] text-paper-subtle">
          {index + 1} / {questions.length}
        </span>
      </div>
      {!relaxed && <Timer key={index} paused={shown !== null} onTimeout={() => answer(null)} />}

      <div key={`q-${index}`} className="mt-5 animate-[rise_220ms_var(--ease-snap)_both]">
        <p className="flex items-center gap-2 font-pixel text-[15px] text-paper-subtle">
          <SpeakerTag>{q.partnerName}</SpeakerTag>
          {q.sceneTitle}
        </p>
        <div className="blk-frame mt-2">
          <p className="blk bg-card px-4 py-3 font-line text-[24px] leading-snug text-ink">{q.partnerLine}</p>
        </div>
        <div className="mt-3 flex items-baseline gap-2.5">
          <SpeakerTag me>나</SpeakerTag>
          <p className="font-pixel text-[15px] leading-snug">{q.intent}</p>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {q.choices.map((c, i) => {
          const mine = shown?.choice?.id === c.id;
          return (
            <li key={`${index}-${c.id}`} className="relative animate-[rise_220ms_var(--ease-snap)_both]" style={{ animationDelay: `${150 + i * 60}ms` }}>
              <BlockButton onClick={() => answer(c)} className={`w-full text-left ${shown && !mine ? "opacity-40" : ""}`} faceClassName="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center bg-ink font-pixel text-[15px] text-paper">{i + 1}</span>
                <span className="min-w-0 flex-1 font-line text-[20px] leading-snug">{c.line}</span>
              </BlockButton>
              {mine && (
                <span
                  className="pointer-events-none absolute -top-2 right-2 -rotate-6 animate-[stamp_280ms_steps(4,end)_both] border-2 border-ink px-1.5 py-1 font-pixel-title text-[12px] leading-none text-ink outline-2 outline-offset-1 outline-ink"
                  style={{ background: STAMP_COLORS[stampKind(c.verdict)] }}
                >
                  {STAMP_LABELS[stampKind(c.verdict)]}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* 고른 뒤 상대 속마음. 이 한 줄이 테스트의 웃음 포인트라 크게 보여준다 */}
      <div className="mt-4 min-h-[64px]" aria-live="polite">
        {shown && (
          <Panel dark className="animate-[pop_260ms_steps(4,end)_both]">
            <p className="px-3 py-2.5 text-[17px] leading-snug">
              <span className="font-pixel text-[15px] text-paper-subtle">{q.partnerName} 속마음 </span>
              {shown.choice ? shown.choice.reaction : "…? (대답이 없네)"}
            </p>
          </Panel>
        )}
      </div>
    </section>
  );
}

// 남은 시간 막대. 탭을 떠나 있는 동안은 멈춘다
function Timer({ paused, onTimeout }: { paused: boolean; onTimeout: () => void }) {
  const [left, setLeft] = useState(QUESTION_MS);
  const remaining = useRef(QUESTION_MS);
  const timeout = useRef(onTimeout);
  useEffect(() => {
    timeout.current = onTimeout;
  });
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) remaining.current = Math.max(0, remaining.current - (now - last));
      last = now;
      setLeft(remaining.current);
      if (remaining.current === 0) {
        clearInterval(id);
        timeout.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [paused]);
  const ratio = left / QUESTION_MS;
  return (
    <div className="mt-3 h-2.5 border-2 border-ink bg-card" role="timer" aria-label={`남은 시간 ${Math.ceil(left / 1000)}초`}>
      <div className={`h-full ${ratio < 0.3 ? "bg-bad" : "bg-gold"}`} style={{ width: `${Math.ceil(ratio * 20) * 5}%` }} />
    </div>
  );
}

// 결과를 바로 보여주지 않고, 무엇을 따져 보는지 한 줄씩 보여준 뒤 넘어간다. 공들여 분석한 결과처럼 느껴지게
const CHECKS = ["직역 성분 검사", "콩글리시 농도 측정", "눈치 레벨 계산", "유형 카드 인쇄"];

function Analyze({ questions, picked, version, friend }: { questions: TestQuestion[]; picked: Picked[]; version: string; friend: Friend | null }) {
  const router = useRouter();
  const [done, setDone] = useState(0);
  useEffect(() => {
    const answers: Answer[] = picked.map((p) => ({ verdict: p.choice?.verdict ?? null, trap: p.choice?.trap, ms: p.ms }));
    const type = scoreType(answers);
    const picks = picked.map((p, i) => (p.choice ? questions[i].choices.findIndex((c) => c.id === p.choice!.id) + 1 : 0));
    const answeredMs = picked.filter((p) => p.choice).map((p) => p.ms);
    const avg = answeredMs.length ? Math.round(answeredMs.reduce((a, b) => a + b, 0) / answeredMs.length / 100) : 0;
    saveMine({ type, picks: picks.join(""), version, avg });
    trackTest("test_completed", { choiceId: type, entry: friend ? "share" : "direct" });
    try {
      sessionStorage.setItem("nuanci.test.fresh", "1");
    } catch {}
    const ticks = CHECKS.map((_, i) => window.setTimeout(() => setDone(i + 1), 420 * (i + 1)));
    const go = window.setTimeout(() => router.replace(resultPath(type, picks, version, avg)), 420 * CHECKS.length + 350);
    return () => [...ticks, go].forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="flex flex-1 flex-col items-center justify-center pb-16 text-center" aria-live="polite">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/svg+xml;base64,${btoa(mochiSvg())}`} width={96} height={102} alt="" className="animate-[bob_0.5s_steps(2,jump-none)_infinite] [image-rendering:pixelated]" />
      <p className="mt-4 font-pixel-title text-[24px]">사고 기록 분석 중…</p>
      <ul className="mt-5 space-y-2 text-left font-pixel text-[15px]">
        {CHECKS.map((c, i) => (
          <li key={c} className={i < done ? "text-paper" : "text-paper-subtle"}>
            <span className={`mr-2 inline-block w-4 ${i < done ? "text-good" : ""}`}>{i < done ? "✔" : "·"}</span>
            {c}
          </li>
        ))}
      </ul>
    </section>
  );
}
