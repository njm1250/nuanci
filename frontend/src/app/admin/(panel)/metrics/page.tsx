import Link from "next/link";
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

type Metrics = { funnel: Funnel; visitors: number; attempts: number; events: number; internalVisitors: number; internalEvents: number; scenes: SceneMetrics[]; activeAccounts: number; registeredAccounts: number; unknownEvents: number };

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

const MARKS: Record<Verdict, { text: string; color: string }> = {
  good: { text: "O", color: "bg-good" },
  meh: { text: "△", color: "bg-warn" },
  bad: { text: "X", color: "bg-bad" },
};

// 첫 답으로 자연스러운 말을 고른 비율로 난이도를 본다. 표본이 적으면 판단하지 않는다
const MIN_SAMPLE = 10;

function difficulty(rate: number, total: number) {
  if (total < MIN_SAMPLE) return `표본 부족 (${MIN_SAMPLE}시도부터)`;
  if (rate >= 70) return "쉬움";
  if (rate >= 40) return "보통";
  return "어려움";
}

function firstPicks(choices: Choice[], counts: ChoiceCount[]) {
  const total = counts.reduce((n, c) => n + c.picks, 0);
  const good = counts.filter((c) => choices.find((x) => x.id === c.choiceId)?.verdict === "good").reduce((n, c) => n + c.picks, 0);
  return { total, rate: pct(good, total) };
}

async function loadMetrics(audience: string): Promise<Metrics> {
  const metrics = await getAdminJson<Metrics>(`/api/admin/metrics?audience=${audience}`);
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
        <p className="font-pixel text-[15px]">단계별 브라우저 수</p>
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
                    {prev !== null && ` · 앞 단계 대비 ${pct(n, prev)}%`}
                  </span>
                </div>
                <div className="mt-1 h-2 bg-ink/10">
                  <div className="h-full bg-gold" style={{ width: `${pct(n, top)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-subtle">각 단계에 도달한 브라우저를 중복 없이 세요. 동일 방문자가 순서대로 진행한 전환율은 아니에요. 직접 유입·과거 기록 때문에 뒤 단계 수가 더 클 수 있어요.</p>
      </div>
    </Panel>
  );
}

async function SceneCard({ m }: { m: SceneMetrics }) {
  const scene = await getAdminScene(m.id);
  const base = scene ? firstPicks(scene.base.choices, m.choices.filter((c) => c.step === "base")) : null;
  return (
    <Panel>
      <details className="group">
        <summary className="cursor-pointer list-none p-4 focus-visible:outline-2 focus-visible:outline-gold [&::-webkit-details-marker]:hidden">
          <div className="flex items-start justify-between gap-3">
            <p className="font-pixel text-[15px]">
              <span className="text-ink-subtle">장면 {m.number}</span> {m.title} <span className="text-ink-subtle">v{m.version}</span>
            </p>
            {base && <span className="shrink-0 bg-ink px-1.5 py-1 font-pixel text-[12px] leading-none text-paper">{difficulty(base.rate, base.total)}</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span>노출 {m.viewed} · 완료 {m.completed} · 완료율 {pct(m.completed, m.viewed)}%</span>
            <span className="font-medium text-ink-subtle"><span className="group-open:hidden">상세 펼치기 ＋</span><span className="hidden group-open:inline">접기 −</span></span>
          </div>
        </summary>
        <div className="border-t border-ink/10 px-4 pb-4">
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
      </details>
    </Panel>
  );
}

async function MetricsBody({ searchParams }: { searchParams: Promise<{ audience?: string; page?: string }> }) {
  const { audience: requested, page: requestedPage } = await searchParams;
  const audience = ["guest", "member", "unknown"].includes(requested ?? "") ? requested! : "all";
  const metrics = await loadMetrics(audience);
  const pages = Math.max(1, Math.ceil(metrics.scenes.length / 10));
  const page = Math.min(pages, Math.max(1, Number.parseInt(requestedPage ?? "1", 10) || 1));
  const scenes = metrics.scenes.slice((page - 1) * 10, page * 10);
  return (
    <>
      <nav aria-label="이벤트 발생 당시 로그인 상태" className="mt-5 flex flex-wrap gap-2 text-[14px]">
        {[["all", "전체"], ["guest", "비로그인"], ["member", "로그인"], ["unknown", "과거 기록"]].map(([value, label]) => (
          <Link key={value} href={`/admin/metrics?audience=${value}`} aria-current={audience === value ? "page" : undefined} className={`px-3 py-2 ${audience === value ? "bg-gold text-ink" : "bg-slate-block text-paper-muted"}`}>{label}</Link>
        ))}
      </nav>
      <p className="mt-3 text-[13px] text-paper-muted">이벤트 당시 상태로 구분해요. 같은 브라우저가 로그인 전후로 이용하면 양쪽에 포함되므로 탭별 방문자 수를 더하면 중복돼요.</p>
      <FunnelCard funnel={metrics.funnel} />
      <Panel className="mt-6">
        <div className="grid grid-cols-3 gap-3 p-4">
          <Stat label="고유 브라우저" value={metrics.visitors} />
          <Stat label="장면 시도" value={metrics.attempts} />
          <Stat label="이벤트" value={metrics.events} />
        </div>
      </Panel>
      <Panel className="mt-3">
        <div className="grid grid-cols-2 gap-3 p-4">
          <Stat label="활동한 로그인 계정" value={metrics.activeAccounts} />
          <Stat label="가입 계정 (전체 누적)" value={metrics.registeredAccounts} />
        </div>
      </Panel>
      <details className="mt-3 text-[13px] leading-relaxed text-paper-muted">
        <summary className="cursor-pointer py-2">집계 기준·내부 방문자 제외 안내</summary>
      <p className="mt-2">
        선택한 범위의 누적 집계예요. 브라우저 저장 ID 기준이라 기기·브라우저 변경이나 저장소 삭제 시 새 방문자로 세요. 로그인 계정은 여러 기기에서도 계정당 한 번 세며, 브라우저 수와 합산하지 않아요. 과거 이벤트 {metrics.unknownEvents}건은 당시 로그인 여부를 몰라 ‘과거 기록’에 남겨요. 계정을 삭제하면 이벤트의 계정 연결도 해제되므로 활동 계정 수는 줄어들 수 있어요.
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-paper-muted">
        관리자 화면을 연 기기 {metrics.internalVisitors}대의 기록 {metrics.internalEvents}건은 빼고 셌어요. 휴대폰에서 해 본 것도 빼려면 그 휴대폰으로 관리자 화면에 한 번 들어오세요.
      </p>
      </details>
      <div className="mt-6 flex items-center justify-between gap-3 text-[14px]">
        <h2 className="font-pixel">장면별 요약 ({metrics.scenes.length})</h2>
        <span className="text-paper-subtle">{page} / {pages} 페이지 · 10개씩</span>
      </div>
      <div className="mt-3 space-y-3">
        {scenes.map((m) => (
          <SceneCard key={m.id} m={m} />
        ))}
      </div>
      {pages > 1 && <nav aria-label="장면별 지표 페이지" className="mt-4 flex justify-between gap-3 text-[14px]">
        {page > 1 ? <Link className="px-3 py-3 bg-slate-block" href={`/admin/metrics?audience=${audience}&page=${page - 1}`}>← 이전 10개</Link> : <span />}
        {page < pages && <Link className="px-3 py-3 bg-slate-block" href={`/admin/metrics?audience=${audience}&page=${page + 1}`}>다음 10개 →</Link>}
      </nav>}
    </>
  );
}

export default function MetricsPage({ searchParams }: { searchParams: Promise<{ audience?: string; page?: string }> }) {
  return (
    <>
      <h1 className="font-pixel-title text-[24px] text-paper">지표</h1>
      <p className="mt-1 text-[14px] leading-relaxed text-paper-muted">
        장면별 수치·비율은 장면을 한 번 연 시도 기준이에요. 난이도는 기본 상황에서 첫 답으로 O를 고른 비율로 봐요 (70% 이상 쉬움, 40% 미만 어려움).
      </p>
      <Suspense fallback={<p className="mt-6 font-pixel text-[15px] text-paper-subtle">불러오는 중…</p>}>
        <MetricsBody searchParams={searchParams} />
      </Suspense>
    </>
  );
}
