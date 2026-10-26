"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadMetricScene } from "./actions";
import type { AdminSceneContent } from "./api";
import type { ChoiceCount, Journey, Metrics, SceneMetrics } from "./metrics-types";
import { AdminEmpty, AdminPanel, AdminStat, number, percent } from "./ui";
import { TRAP_LABELS, type Choice } from "@/features/scene/types";
import { TYPES, type TypeId } from "@/features/typetest/types";
import { ActivityTrend } from "./activity-trend";

const ratio = (a: number, b: number) => (b ? `${percent(a, b)}%` : "—");
const COLUMNS = [
  { key: "viewed", label: "노출" },
  { key: "baseChosen", label: "첫 선택" },
  { key: "followUpChosen", label: "후속 선택" },
  { key: "completed", label: "답변 완료" },
  { key: "rate", label: "완료 / 노출" },
  { key: "wrongRate", label: "첫 답 오답률" },
  { key: "wrapViewed", label: "정리 화면" },
  { key: "nextClicked", label: "다음 클릭" },
  { key: "alternativesViewed", label: "다른 표현" },
  { key: "shared", label: "공유" },
  { key: "fromNext", label: "다음으로 유입" },
] as const;
type Sort = (typeof COLUMNS)[number]["key"] | "number";
type Column = (typeof COLUMNS)[number]["key"];

// 첫 답 오답률이 이보다 낮으면 대부분 한 번에 맞히는 장면이라 '쉬움'으로 표시한다(표본이 적으면 표시하지 않는다)
const EASY_BELOW = 0.3;
const EASY_MIN_TRIES = 5;

// 표의 한 칸 값. 비율 칸은 계산해서, 나머지는 장면 지표 그대로 쓴다
function columnValue(s: SceneMetrics, key: Column) {
  if (key === "rate") return s.viewed ? s.completed / s.viewed : -1;
  if (key === "wrongRate") return s.firstTries ? s.firstWrong / s.firstTries : -1;
  return s[key];
}

function columnText(s: SceneMetrics, key: Column) {
  if (key === "rate") return ratio(s.completed, s.viewed);
  if (key === "wrongRate") {
    if (!s.firstTries) return "—";
    const easy = s.firstTries >= EASY_MIN_TRIES && s.firstWrong / s.firstTries < EASY_BELOW;
    return `${ratio(s.firstWrong, s.firstTries)} (${s.firstTries})${easy ? " 쉬움" : ""}`;
  }
  return number(s[key]);
}

function exportCsv(rows: SceneMetrics[]) {
  const escape = (value: string | number) => {
    const text = String(value);
    return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
  };
  const content = [
    [
      "장면 번호",
      "장면 ID",
      "제목",
      "현재 버전",
      ...COLUMNS.map((c) => c.label),
    ],
    ...rows.map((s) => [
      s.number,
      s.id,
      s.title,
      s.version,
      ...COLUMNS.map((c) => columnText(s, c.key)),
    ]),
  ]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "nuanci-scene-metrics.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function ChoiceDistribution({
  title,
  choices,
  counts,
}: {
  title: string;
  choices: Choice[];
  counts: ChoiceCount[];
}) {
  const total = counts.reduce((sum, c) => sum + c.picks, 0);
  const good = counts
    .filter((c) => choices.find((x) => x.id === c.choiceId)?.verdict === "good")
    .reduce((sum, c) => sum + c.picks, 0);
  const unknown = counts.filter(
    (c) => !choices.some((x) => x.id === c.choiceId),
  );
  return (
    <section style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 12, fontWeight: 650 }}>
        {title}
        <span className="adm-secondary">
          첫 선택 {number(total)}건 · 현재 보기의 O {ratio(good, total)}
        </span>
      </h3>
      {choices.map((c) => {
        const picks = counts.find((x) => x.choiceId === c.id)?.picks ?? 0;
        const share = percent(picks, total);
        const quality =
          c.verdict !== "good" && total >= 30
            ? share < 10
              ? "선택 적음"
              : share >= 30 && share <= 60
                ? "선택 집중"
                : null
            : null;
        return (
          <div
            className="adm-choice"
            key={c.id}
            data-tone={
              c.verdict === "good"
                ? "positive"
                : c.verdict === "meh"
                  ? "warning"
                  : "critical"
            }
          >
            <div className="adm-choice-top">
              <span
                className={`adm-badge ${c.verdict === "good" ? "adm-badge-success" : c.verdict === "meh" ? "adm-badge-warning" : "adm-badge-danger"}`}
              >
                {c.verdict === "good" ? "O" : c.verdict === "meh" ? "△" : "X"}
              </span>
              <span>{c.line}</span>
              <strong>
                {number(picks)} · {ratio(picks, total)}
              </strong>
            </div>
            <div className="adm-bar">
              <span
                style={{
                  width: `${share}%`,
                }}
              />
            </div>
            <p className="adm-secondary">
              {c.trap && TRAP_LABELS[c.trap]}
              {quality && ` · ${quality} (30건 이상 기준)`}
            </p>
          </div>
        );
      })}
      {unknown.length > 0 && (
        <p className="adm-notice adm-notice-warning" style={{ marginTop: 10 }}>
          현재 보기에 없는 ID의 과거 선택{" "}
          {unknown.reduce((n, c) => n + c.picks, 0)}건이 분모에 포함돼 있습니다.
        </p>
      )}
    </section>
  );
}

function SceneDetail({ row }: { row: SceneMetrics | undefined }) {
  const [loaded, setLoaded] = useState<{
    key: string;
    scene: AdminSceneContent | null;
    error?: string;
  } | null>(null);
  const cache = useRef(new Map<string, AdminSceneContent | null>());
  const id = row?.id;
  const key = row ? `${row.id}:${row.version}` : "";
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const present = cache.current.get(key);
    const promise = cache.current.has(key)
      ? Promise.resolve(present ?? null)
      : loadMetricScene(id);
    promise
      .then((scene) => {
        if (alive) {
          cache.current.set(key, scene);
          setLoaded({ key, scene });
        }
      })
      .catch(() => {
        if (alive)
          setLoaded({
            key,
            scene: null,
            error:
              "보기 정보를 불러오지 못했습니다. 다른 장면을 선택한 뒤 다시 시도해 주세요.",
          });
      });
    return () => {
      alive = false;
    };
  }, [id, key]);
  if (!row)
    return (
      <AdminPanel title="장면 상세">
        <AdminEmpty>표에서 장면을 선택하세요.</AdminEmpty>
      </AdminPanel>
    );
  const scene = loaded?.key === key ? loaded.scene : null;
  const counts = row.choices.filter((c) => c.step === "base");
  const total = counts.reduce((n, c) => n + c.picks, 0);
  const good = scene
    ? counts
        .filter(
          (c) =>
            scene.base.choices.find((x) => x.id === c.choiceId)?.verdict ===
            "good",
        )
        .reduce((n, c) => n + c.picks, 0)
    : 0;
  const rate = percent(good, total);
  return (
    <AdminPanel title="선택한 장면" className="adm-detail">
      <div className="adm-panel-body">
        <div className="adm-muted">
          장면 {row.number} · 현재 v{row.version}
        </div>
        <h3 className="adm-detail-title">{row.title}</h3>
        <div className="adm-actions">
          <Link href={`/admin/scenes/${row.id}`} className="adm-btn adm-btn-sm">
            내용 편집
          </Link>
          <Link
            href={`/admin/preview/${row.id}`}
            target="_blank"
            rel="noreferrer"
            className="adm-btn adm-btn-sm"
          >
            미리보기 ↗
          </Link>
        </div>
        <div className="adm-detail-stats" style={{ marginTop: 18 }}>
          <div>
            <span>완료 / 노출</span>
            <strong>{ratio(row.completed, row.viewed)}</strong>
          </div>
          <div>
            <span>다음 클릭 / 완료</span>
            <strong>{ratio(row.nextClicked, row.completed)}</strong>
          </div>
          <div>
            <span>기본 첫 답 O</span>
            <strong>{scene ? ratio(good, total) : "…"}</strong>
          </div>
        </div>
        {scene ? (
          <>
            <p className="adm-muted" style={{ marginTop: 12 }}>
              난이도 추정:{" "}
              {total < 10
                ? "표본 부족 (10건부터)"
                : rate >= 70
                  ? "쉬움"
                  : rate >= 40
                    ? "보통"
                    : "어려움"}
            </p>
            <div className="adm-choice-columns">
              <ChoiceDistribution
                title="기본 상황"
                choices={scene.base.choices}
                counts={counts}
              />
              <ChoiceDistribution
                title="만약에"
                choices={scene.followUp.choices}
                counts={row.choices.filter((c) => c.step === "followUp")}
              />
            </div>
            <p className="adm-muted" style={{ marginTop: 16 }}>
              선택 수는 선택 기간의 모든 버전을 합친 값이며, 대사·판정은 현재
              버전입니다. 비율만으로 보기의 언어적 품질을 확정할 수 없습니다.
            </p>
          </>
        ) : (
          <p className="adm-muted" role="status" style={{ marginTop: 20 }}>
            {loaded?.key === key
              ? (loaded.error ?? "장면 본문을 찾지 못했습니다.")
              : "선택지 불러오는 중…"}
          </p>
        )}
      </div>
    </AdminPanel>
  );
}

// 사람 방문자가 가장 깊이 간 단계. 앞쪽(얕은 단계)에서 많이 멈출수록 그 단계가 구멍이다
function JourneyPanel({ journey: j }: { journey: Journey }) {
  const stages = [
    ["홈에서 반응 없이 나감", j.silentHome, "누르거나 스크롤하지 않음 · 잠깐 보고 닫았거나 봇"],
    ["홈만 둘러보고 나감", j.browsed, "반응은 했지만 장면을 열지 않음"],
    ["장면을 열고 반응 없이 나감", j.silentScene, "링크로 바로 열고 닫음 · 봇일 수 있음"],
    ["빌드업 대사 중에 나감", j.leftInLead, "대사가 끝나기 전에 떠남"],
    ["질문에서 나감", j.leftAtQuestion, "대사는 다 봤지만 답을 안 고름"],
    ["답을 고르고 장면 중간에 나감", j.leftMidScene, "장면을 끝내지 않음"],
    ["장면 1개 끝냄", j.oneScene, ""],
    ["장면 2개 이상 끝냄", j.moreScenes, "다시 하고 싶었던 사람"],
  ] as const;
  const total = stages.reduce((n, [, v]) => n + v, 0);
  const max = Math.max(...stages.map(([, v]) => v), 1);
  return (
    <AdminPanel
      title="사람 방문자는 어디까지 갔나"
      description="가장 깊이 간 단계 하나로 셈 · 내부·봇 제외 · 선택 기간"
    >
      <div className="adm-panel-body">
        {stages.map(([label, n, note], i) => (
          <div
            className="adm-funnel-row"
            key={label}
            data-tone={i >= 6 ? "positive" : "informative"}
          >
            <span title={note || undefined}>{label}</span>
            <div className="adm-bar">
              <span style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <strong>{number(n)}</strong>
            <small>{ratio(n, total)}</small>
          </div>
        ))}
        <p className="adm-muted" style={{ marginTop: 12 }}>
          {j.engagementTracked
            ? "반응은 화면을 처음 누르거나 스크롤한 순간입니다. 대사 단계는 빌드업이 끝날 때 남깁니다."
            : "이 기간에는 반응·대사 기록이 아직 없어서 답을 안 고른 방문이 모두 ‘반응 없이 나감’으로 잡힙니다. 기록을 넣은 뒤부터 정확해집니다."}
        </p>
      </div>
    </AdminPanel>
  );
}

export function MetricsDashboard({
  metrics: m,
  initialScene,
}: {
  metrics: Metrics;
  initialScene?: string;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("viewed");
  const [desc, setDesc] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [selected, setSelected] = useState(
    initialScene ?? [...m.scenes].sort((a, b) => b.viewed - a.viewed)[0]?.id,
  );
  const rows = m.scenes
    .filter((s) =>
      `${s.title} ${s.id} ${s.number}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => {
      const val = (s: SceneMetrics) =>
        sort === "number" ? s.number : columnValue(s, sort);
      return (val(a) - val(b)) * (desc ? -1 : 1) || a.number - b.number;
    });
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages - 1);
  const sortBy = (key: Sort) => {
    setDesc(sort === key ? !desc : key !== "number");
    setSort(key);
    setPage(0);
  };
  const steps = [
    ["홈 방문", m.funnel.home],
    ["장면 시작", m.funnel.started],
    ["첫 선택", m.funnel.firstPick],
    ["답변 완료", m.funnel.answered],
    ["정리 화면", m.funnel.wrapped],
    ["다음 장면 클릭", m.funnel.next],
  ] as const;
  const max = Math.max(...steps.map(([, n]) => n), 1);
  const t = m.test;
  return (
    <>
      <div className="adm-stats">
        <AdminStat
          label="고유 브라우저"
          tone="informative"
          value={m.visitors}
          note="저장 ID 기준 · 내부 방문 제외"
        />
        <AdminStat
          label="장면 시도"
          value={m.attempts}
          note="시도 ID 중복 제거"
        />
        <AdminStat
          label="이벤트"
          value={m.events}
          note="선택·탐색·공유 등 전체 이벤트"
        />
        <AdminStat
          label="활동한 로그인 계정"
          value={m.activeAccounts}
          note="선택한 로그인 상태 기준"
        />
        <AdminStat
          label="가입 계정 · 전체 누적"
          value={m.registeredAccounts}
          note="내부 계정 제외 · 탭과 무관"
        />
        {m.botVisitors !== undefined && (
          <AdminStat
            label="봇으로 거른 브라우저"
            value={m.botVisitors}
            note="크롤러·미리보기·자동화 · 전체 누적"
          />
        )}
      </div>
      {m.daily && (
        <div style={{ marginBottom: 20 }}>
          <ActivityTrend days={m.daily} period={m.period ?? "all"} />
        </div>
      )}
      {m.journey && (
        <div style={{ marginBottom: 20 }}>
          <JourneyPanel journey={m.journey} />
        </div>
      )}
      <div className="adm-grid adm-grid-2">
        <AdminPanel
          title="장면 이용 단계"
          description="각 단계에 도달한 고유 브라우저 · 선택 기간"
        >
          <div className="adm-panel-body">
            {steps.map(([label, n], i) => (
              <div
                className="adm-funnel-row"
                key={label}
                data-tone={label === "답변 완료" ? "positive" : "informative"}
              >
                <span>{label}</span>
                <div className="adm-bar">
                  <span style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <strong>{number(n)}</strong>
                <small>
                  {i ? `앞 단계 대비 ${ratio(n, steps[i - 1][1])}` : "브라우저"}
                </small>
              </div>
            ))}
            <p className="adm-muted" style={{ marginTop: 12 }}>
              동일 집단의 순차 전환율은 아닙니다. 직접 유입·과거 기록 때문에 뒤
              단계 수나 비율이 더 클 수 있습니다.
            </p>
          </div>
        </AdminPanel>
        <AdminPanel
          title="영어 사고 유형 테스트"
          description="고유 브라우저 기준 · 선택 기간"
        >
          {t ? (
            <>
              <div className="adm-panel-body">
                {(
                  [
                    ["소개 화면", t.viewed],
                    ["테스트 시작", t.started],
                    ["결과 도착", t.completed],
                    ["공유", t.shared],
                    ["친구 결과 링크 열람", t.friendViewed],
                    ["친구 링크에서 시작", t.fromFriend],
                  ] as const
                ).map(([label, n]) => (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "7px 0",
                      borderBottom:
                        "1px solid var(--adm-stroke-neutral-subtle)",
                    }}
                    key={label}
                  >
                    <span>{label}</span>
                    <strong style={{ fontWeight: 600 }}>{number(n)}</strong>
                  </div>
                ))}
                <div className="adm-mix-tags" style={{ marginTop: 12 }}>
                  <span>
                    결과 / 시작<strong>{ratio(t.completed, t.started)}</strong>
                  </span>
                  <span>
                    공유 / 결과<strong>{ratio(t.shared, t.completed)}</strong>
                  </span>
                  <span>
                    친구 시작 / 링크 열람
                    <strong>{ratio(t.fromFriend, t.friendViewed)}</strong>
                  </span>
                </div>
                {Object.keys(t.types).length > 0 && (
                  <div className="adm-mix-tags" style={{ marginTop: 10 }}>
                    {Object.entries(t.types)
                      .sort((a, b) => b[1] - a[1])
                      .map(([id, n]) => (
                        <span key={id}>
                          {TYPES[id as TypeId]?.name ?? id}
                          <strong>
                            {number(n)} ·{" "}
                            {ratio(
                              n,
                              Object.values(t.types).reduce((a, b) => a + b, 0),
                            )}
                          </strong>
                        </span>
                      ))}
                  </div>
                )}
                <p className="adm-muted" style={{ marginTop: 10 }}>
                  동일 브라우저가 여러 유형을 받으면 유형별 집계에 중복될 수
                  있습니다.
                </p>
              </div>
            </>
          ) : (
            <AdminEmpty>테스트 지표가 없습니다.</AdminEmpty>
          )}
        </AdminPanel>
      </div>
      <AdminPanel
        title="유입 채널"
        description="최초 utm_source, 없으면 리퍼러 기준 · 최대 30개"
      >
        <div className="adm-table-scroll" style={{ maxHeight: 320 }}>
          <table className="adm-table" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th>채널</th>
                {[
                  "브라우저",
                  "장면 시작",
                  "장면 완료",
                  "완료 / 시작",
                  "테스트 시작",
                  "테스트 결과",
                  "공유",
                  "공유 / 브라우저",
                ].map((c) => (
                  <th className="adm-numeric" key={c}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(m.sources ?? []).map((s) => (
                <tr key={s.channel ?? ""}>
                  <td style={{ minWidth: 150, fontWeight: 550 }}>
                    {s.channel ?? "출처 없음"}
                  </td>
                  {[
                    number(s.visitors),
                    number(s.sceneStarted),
                    number(s.sceneCompleted),
                    ratio(s.sceneCompleted, s.sceneStarted),
                    number(s.testStarted),
                    number(s.testCompleted),
                    number(s.shared),
                    ratio(s.shared, s.visitors),
                  ].map((v, i) => (
                    <td key={i} className="adm-numeric">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!m.sources?.length && (
            <AdminEmpty>유입 채널 데이터가 없습니다.</AdminEmpty>
          )}
        </div>
      </AdminPanel>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          margin: "28px 0 12px",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 650 }}>
          장면별 성과 <span className="adm-muted">{m.scenes.length}개</span>
        </h2>
        <span className="adm-muted">
          행의 장면명을 선택하면 선택지 분포가 표시됩니다.
        </span>
      </div>
      <div className="adm-split">
        <section className="adm-panel">
          <div className="adm-toolbar">
            <div className="adm-toolbar-group">
              <input
                type="search"
                className="adm-input"
                placeholder="장면 제목, ID, 번호 검색"
                aria-label="지표 장면 검색"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
              <span className="adm-muted">{rows.length}개</span>
            </div>
            <button
              type="button"
              className="adm-btn adm-btn-sm"
              onClick={() => exportCsv(rows)}
            >
              CSV 내보내기
            </button>
          </div>
          <div className="adm-table-scroll">
            <table
              className="adm-table adm-table-sticky-first"
              style={{ minWidth: 1150 }}
            >
              <thead>
                <tr>
                  <th
                    aria-sort={
                      sort === "number"
                        ? desc
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    <button type="button" onClick={() => sortBy("number")}>
                      장면 {sort === "number" ? (desc ? "↓" : "↑") : "↕"}
                    </button>
                  </th>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className="adm-numeric"
                      aria-sort={
                        sort === c.key
                          ? desc
                            ? "descending"
                            : "ascending"
                          : "none"
                      }
                    >
                      <button type="button" onClick={() => sortBy(c.key)}>
                        {c.label} {sort === c.key ? (desc ? "↓" : "↑") : "↕"}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(current * size, (current + 1) * size).map((s) => (
                  <tr
                    key={s.id}
                    className={selected === s.id ? "adm-selected" : undefined}
                  >
                    <td>
                      <button
                        type="button"
                        aria-pressed={selected === s.id}
                        className="adm-row-button"
                        onClick={() => setSelected(s.id)}
                      >
                        #{s.number} {s.title}
                        <span className="adm-secondary">
                          v{s.version} · {s.id}
                        </span>
                      </button>
                    </td>
                    {COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className={`adm-numeric ${columnValue(s, c.key) <= 0 ? "adm-value-zero" : c.key === "completed" || c.key === "rate" ? "adm-value-positive" : ""}`}
                      >
                        {columnText(s, c.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <AdminEmpty>검색 조건에 맞는 장면이 없습니다.</AdminEmpty>
            )}
          </div>
          <div className="adm-pagination">
            <span>
              {rows.length ? current * size + 1 : 0}–
              {Math.min((current + 1) * size, rows.length)} / {rows.length}개
            </span>
            <div className="adm-toolbar-group">
              <select
                aria-label="지표 페이지당 행 수"
                className="adm-select"
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                <option value={25}>25개씩</option>
                <option value={50}>50개씩</option>
                <option value={10000}>전체</option>
              </select>
              <button
                className="adm-btn adm-btn-sm"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                이전
              </button>
              <span>
                {current + 1}/{pages}
              </span>
              <button
                className="adm-btn adm-btn-sm"
                disabled={current === pages - 1}
                onClick={() => setPage(current + 1)}
              >
                다음
              </button>
            </div>
          </div>
        </section>
        <SceneDetail row={m.scenes.find((s) => s.id === selected)} />
      </div>
      <details className="adm-panel adm-section-space">
        <summary
          style={{ padding: "14px 18px", fontWeight: 600, fontSize: 12 }}
        >
          집계 기준 · 데이터 해석
        </summary>
        <div className="adm-panel-body">
          <p className="adm-muted">
            전체 지표는 선택한 기간과 로그인 상태의 값입니다. 가입 계정 수는
            전체 누적입니다. 브라우저 저장 ID는 사람 수가 아니며, 로그인 계정
            수와 합산하지 않습니다. 로그인 전후 동일 브라우저는 서로 다른 탭에
            중복 포함될 수 있습니다.
          </p>
          <p className="adm-muted" style={{ marginTop: 8 }}>
            전체 기간 내부 브라우저 {m.internalVisitors}개(그중 AI 확인 {m.aiVisitors}개), 봇 {number(m.botVisitors ?? 0)}개 · 내부 이벤트{" "}
            {number(m.internalEvents)}건 제외. 당시 로그인 상태를 모르는 과거
            이벤트 {number(m.unknownEvents)}건은 ‘과거 기록’ 탭에 포함됩니다.
            탈퇴 시 이벤트의 계정 연결은 해제됩니다.
          </p>
          <p className="adm-muted" style={{ marginTop: 8 }}>
            장면 노출·각 선택 단계·완료·정리·다음 클릭·다음으로 유입은 시도 ID
            중복 제거, 다른 표현과 공유는 이벤트 수입니다. 장면별 완료율은 답변
            완료 / 노출입니다. 표와 CSV는 선택 기간의 모든 버전을 합친 값이며
            버전별 성과 비교가 아닙니다.
          </p>
          <p className="adm-muted" style={{ marginTop: 8 }}>
            난이도는 기본 첫 답 O 비율로 10건부터 표시합니다. 70% 이상 쉬움, 40%
            이상 보통, 40% 미만 어려움. 오답 보기의 선택 비율 표시는 30건
            이상에서 10% 미만 ‘선택 적음’, 30–60% ‘선택 집중’으로 표시하며 품질
            판정이 아닙니다.
          </p>
          <p className="adm-muted" style={{ marginTop: 8 }}>
            첫 답 오답률은 시도마다 질문 1에서 처음 고른 답 중 O가 아닌 비율입니다(괄호는 첫 답 수). {EASY_MIN_TRIES}건 이상에서{" "}
            {EASY_BELOW * 100}% 미만이면 ‘쉬움’으로 표시합니다. 맞혀도 처음 알게 되는 게 없는 장면일 수 있습니다.
          </p>
        </div>
      </details>
    </>
  );
}
