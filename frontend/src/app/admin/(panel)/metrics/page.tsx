import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminJson, getAdminScene } from "@/features/admin/api";
import { Panel } from "@/features/scene/block-ui";
import { TRAP_LABELS, type Choice, type Verdict } from "@/features/scene/types";

export const metadata: Metadata = { title: "지표 · nuanci" };

type ChoiceCount = { step: "base" | "followUp"; choiceId: string; picks: number };

type SceneMetrics = {
  id: string;
  number: number;
  title: string;
  version: number;
  viewed: number;
  baseChosen: number;
  followUpChosen: number;
  completed: number;
  wrapViewed: number;
  nextClicked: number;
  alternativesViewed: number;
  shared: number;
  fromNext: number;
  choices: ChoiceCount[];
};

type Funnel = { home: number; started: number; firstPick: number; answered: number; wrapped: number; next: number };

type Metrics = { funnel: Funnel; visitors: number; attempts: number; events: number; internalVisitors: number; internalEvents: number; scenes: SceneMetrics[] };

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

const MARKS: Record<Verdict, { text: string; color: string }> = {
  good: { text: "O", color: "bg-good" },
  meh: { text: "△", color: "bg-warn" },
  bad: { text: "X", color: "bg-bad" },
};

// 첫 답으로 자연스러운 말을 고른 비율로 난이도를 본다. 표본이 적으면 판단하지 않는다
const MIN_SAMPLE = 10;

function difficulty(rate: number, total: number) {
  if (total < MIN_SAMPLE) return `표본 부족 (${MIN_SAMPLE}명부터)`;
  if (rate >= 70) return "쉬움";
  if (rate >= 40) return "보통";
  return "어려움";
}

function firstPicks(choices: Choice[], counts: ChoiceCount[]) {
  const total = counts.reduce((n, c) => n + c.picks, 0);
  const good = counts.filter((c) => choices.find((x) => x.id === c.choiceId)?.verdict === "good").reduce((n, c) => n + c.picks, 0);
  return { total, rate: pct(good, total) };
}

async function loadMetrics(): Promise<Metrics> {
  const metrics = await getAdminJson<Metrics>("/api/admin/metrics");
  if (!metrics) throw new Error("지표를 불러오지 못했어요");
  return metrics;
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <p className="text-[13px] text-ink-subtle">{label}</p>
      <p className="mt-0.5 font-pixel-title text-[24px] leading-none">{value}</p>
      {sub && <p className="mt-1 text-[13px] text-rust">{sub}</p>}
    </div>
  );
}

function ChoiceBars({ label, choices, counts }: { label: string; choices: Choice[]; counts: ChoiceCount[] }) {
  const { total, rate } = firstPicks(choices, counts);
  return (
    <div className="mt-4">
      <p className="font-pixel text-[15px] text-ink-subtle">
        {label} 첫 선택 ({total}) · 첫 답 O {rate}%
      </p>
      <ul className="mt-1.5 space-y-2">
        {choices.map((c) => {
          const picks = counts.find((x) => x.choiceId === c.id)?.picks ?? 0;
          return (
            <li key={c.id}>
              <div className="flex justify-between gap-3 text-[14px]">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`grid size-5 shrink-0 place-items-center font-pixel text-[12px] leading-none ${MARKS[c.verdict].color}`}>{MARKS[c.verdict].text}</span>
                  <span className="font-medium">{c.line}</span>
                  {c.trap && <span className="shrink-0 text-[12px] text-ink-subtle">{TRAP_LABELS[c.trap]}</span>}
                </span>
                <span className="shrink-0 text-[13px] font-medium tabular-nums">
                  {picks} · {pct(picks, total)}%
                </span>
              </div>
              <div className="mt-1 h-2 bg-ink/10">
                <div className={`h-full ${MARKS[c.verdict].color}`} style={{ width: `${pct(picks, total)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const FUNNEL_STEPS: [keyof Funnel, string][] = [
  ["home", "홈 방문"],
  ["started", "장면 시작"],
  ["firstPick", "첫 선택"],
  ["answered", "답변 완료"],
  ["wrapped", "정리 화면"],
  ["next", "다음 장면"],
];

// 방문자가 어느 단계에서 빠지는지 본다. 막대는 홈 방문자를 100%로 둔다
function FunnelCard({ funnel }: { funnel: Funnel }) {
  const top = Math.max(funnel.home, funnel.started, 1);
  return (
    <Panel className="mt-6">
      <div className="p-4">
        <p className="font-pixel text-[15px]">단계별 방문자</p>
        <ul className="mt-3 space-y-2">
          {FUNNEL_STEPS.map(([key, label], i) => {
            const n = funnel[key];
            const prev = i > 0 ? funnel[FUNNEL_STEPS[i - 1][0]] : null;
            return (
              <li key={key}>
                <div className="flex justify-between gap-3 text-[14px]">
                  <span className="font-medium">{label}</span>
                  <span className="shrink-0 text-[13px] font-medium tabular-nums">
                    {n}
                    {prev !== null && ` · 앞 단계의 ${pct(n, prev)}%`}
                  </span>
                </div>
                <div className="mt-1 h-2 bg-ink/10">
                  <div className="h-full bg-gold" style={{ width: `${pct(n, top)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-subtle">홈 방문은 이번 업데이트부터 셌어요. 공유 링크로 장면에 바로 들어오면 홈을 거치지 않아요.</p>
      </div>
    </Panel>
  );
}

async function SceneCard({ m }: { m: SceneMetrics }) {
  const scene = await getAdminScene(m.id);
  const base = scene ? firstPicks(scene.base.choices, m.choices.filter((c) => c.step === "base")) : null;
  return (
    <Panel>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-pixel text-[15px]">
            <span className="text-ink-subtle">장면 {m.number}</span> {m.title} <span className="text-ink-subtle">v{m.version}</span>
          </p>
          {base && <span className="shrink-0 bg-ink px-1.5 py-1 font-pixel text-[12px] leading-none text-paper">{difficulty(base.rate, base.total)}</span>}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="노출" value={m.viewed} />
          <Stat label="첫 선택" value={m.baseChosen} sub={`노출의 ${pct(m.baseChosen, m.viewed)}%`} />
          <Stat label="답변 완료" value={m.completed} sub={`첫 선택의 ${pct(m.completed, m.baseChosen)}%`} />
        </div>
        <p className="mt-4 text-[13px] text-ink-muted">
          정리 화면 {m.wrapViewed} · 다음 장면 누름 {m.nextClicked} · 다음 장면으로 들어옴 {m.fromNext} · 다른 표현 탐색 {m.alternativesViewed} · 공유 {m.shared}
        </p>
        {scene && (
          <>
            <ChoiceBars label="기본 상황" choices={scene.base.choices} counts={m.choices.filter((c) => c.step === "base")} />
            <ChoiceBars label="만약에" choices={scene.followUp.choices} counts={m.choices.filter((c) => c.step === "followUp")} />
          </>
        )}
      </div>
    </Panel>
  );
}

async function MetricsBody() {
  const metrics = await loadMetrics();
  return (
    <>
      <FunnelCard funnel={metrics.funnel} />
      <Panel className="mt-6">
        <div className="grid grid-cols-3 gap-3 p-4">
          <Stat label="방문자" value={metrics.visitors} />
          <Stat label="시도" value={metrics.attempts} />
          <Stat label="이벤트" value={metrics.events} />
        </div>
      </Panel>
      <p className="mt-3 text-[13px] leading-relaxed text-paper-muted">
        관리자 화면을 연 기기 {metrics.internalVisitors}대의 기록 {metrics.internalEvents}건은 빼고 셌어요. 휴대폰에서 해 본 것도 빼려면 그 휴대폰으로 관리자 화면에 한 번 들어오세요.
      </p>
      <div className="mt-6 space-y-6">
        {metrics.scenes.map((m) => (
          <SceneCard key={m.id} m={m} />
        ))}
      </div>
    </>
  );
}

export default function MetricsPage() {
  return (
    <>
      <h1 className="font-pixel-title text-[24px] text-paper">지표</h1>
      <p className="mt-1 text-[14px] leading-relaxed text-paper-muted">
        시도는 장면을 한 번 연 것이에요. 비율은 모두 시도 기준이에요. 난이도는 기본 상황에서 첫 답으로 O를 고른 비율로 봐요 (70% 이상 쉬움, 40% 미만 어려움).
      </p>
      <Suspense fallback={<p className="mt-6 font-pixel text-[15px] text-paper-subtle">불러오는 중…</p>}>
        <MetricsBody />
      </Suspense>
    </>
  );
}
