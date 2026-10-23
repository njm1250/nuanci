import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminJson, getAdminScene } from "@/features/admin/api";
import { Panel } from "@/features/scene/block-ui";
import type { Choice } from "@/features/scene/types";

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
  alternativesViewed: number;
  shared: number;
  fromNext: number;
  choices: ChoiceCount[];
};

type Metrics = { visitors: number; attempts: number; events: number; scenes: SceneMetrics[] };

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

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
  const total = counts.reduce((n, c) => n + c.picks, 0);
  return (
    <div className="mt-4">
      <p className="font-pixel text-[15px] text-ink-subtle">
        {label} 첫 선택 <span className="text-ink-subtle">({total})</span>
      </p>
      <ul className="mt-1.5 space-y-2">
        {choices.map((c) => {
          const picks = counts.find((x) => x.choiceId === c.id)?.picks ?? 0;
          return (
            <li key={c.id}>
              <div className="flex justify-between gap-3 text-[14px]">
                <span className="font-medium">{c.line}</span>
                <span className="shrink-0 text-[13px] font-medium tabular-nums">
                  {picks} · {pct(picks, total)}%
                </span>
              </div>
              <div className="mt-1 h-2 bg-ink/10">
                <div className="h-full bg-gold" style={{ width: `${pct(picks, total)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

async function SceneCard({ m }: { m: SceneMetrics }) {
  const scene = await getAdminScene(m.id);
  return (
    <Panel>
      <div className="p-4">
        <p className="font-pixel text-[15px]">
          <span className="text-ink-subtle">장면 {m.number}</span> {m.title} <span className="text-ink-subtle">v{m.version}</span>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="노출" value={m.viewed} />
          <Stat label="첫 선택" value={m.baseChosen} sub={`노출의 ${pct(m.baseChosen, m.viewed)}%`} />
          <Stat label="완료" value={m.completed} sub={`첫 선택의 ${pct(m.completed, m.baseChosen)}%`} />
        </div>
        <p className="mt-4 text-[13px] text-ink-muted">
          다음 장면으로 들어옴 {m.fromNext} · 다른 표현 탐색 {m.alternativesViewed} · 공유 링크 복사 {m.shared}
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
      <Panel className="mt-6">
        <div className="grid grid-cols-3 gap-3 p-4">
          <Stat label="방문자" value={metrics.visitors} />
          <Stat label="시도" value={metrics.attempts} />
          <Stat label="이벤트" value={metrics.events} />
        </div>
      </Panel>
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
      <p className="mt-1 text-[14px] text-paper-muted">시도는 장면을 한 번 연 것이에요. 비율은 모두 시도 기준이에요.</p>
      <Suspense fallback={<p className="mt-6 font-pixel text-[15px] text-paper-subtle">불러오는 중…</p>}>
        <MetricsBody />
      </Suspense>
    </>
  );
}
