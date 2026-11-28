"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// 조회 결과(표)를 차트로 그린다. SQL 콘솔에서는 열을 골라 가며 보고, 보드에서는 저장한 설정 그대로 그린다.
// 설정은 열 이름으로 둔다. 조회를 고쳐 열 순서가 바뀌어도 같은 열을 찾는다

export type ChartKind = "number" | "bar" | "hbar" | "line" | "table";
export type ChartConfig = { kind: ChartKind; xCol?: string | null; yCol?: string | null; splitCol?: string | null };
type Cell = string | null;

// 어두운 패널(#1a1e25) 위에서 이웃한 색이 색각 이상에서도 구분되는지 검증한 8색. 순서를 바꾸거나 아홉 번째 색을 더하지 않는다
const PALETTE = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"];
const OTHER = "#7c8594";
// 판정과 호출 결과는 상태라서 어느 조회에서든 같은 색을 쓴다
const FIXED: Record<string, string> = {
  통함: "#0ca30c",
  good: "#0ca30c",
  애매함: "#fab219",
  meh: "#fab219",
  "다르게 들림": "#d03b3b",
  bad: "#d03b3b",
  ok: "#0ca30c",
  blocked: "#fab219",
  failed: "#d03b3b",
  "직접 입력": "#7c8594",
  "알 수 없음": "#5b6372",
};
const MAX_SERIES = 8;
// 날짜 축은 석 달 남짓까지 그린다. 축 글자는 솎아서 적는다
const MAX_POINTS = 120;
const ALL = "*";
// 그림의 가로 폭은 실제 칸 너비를 따른다. 넓은 칸에서 그림을 늘려 그리면 글자까지 커진다
const DEFAULT_W = 760;
const KINDS: { kind: ChartKind; label: string }[] = [
  { kind: "bar", label: "세로 막대" },
  { kind: "hbar", label: "가로 막대" },
  { kind: "line", label: "선" },
  { kind: "table", label: "표" },
  { kind: "number", label: "숫자" },
];

const num = (cell: Cell) => {
  if (cell === null || cell.trim() === "") return null;
  const n = Number(cell);
  return Number.isFinite(n) ? n : null;
};
const fmt = (n: number) => n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
// 날짜는 월/일만, 긴 이름은 잘라서 축에 쓴다. 전체 이름은 올렸을 때 나온다
const short = (label: string, max: number) => {
  const date = /^\d{4}-(\d{2})-(\d{2})/.exec(label);
  if (date) return `${date[1]}/${date[2]}`;
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
};

function niceTicks(max: number) {
  if (max <= 0) return [0, 1];
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? rough;
  const ticks = [];
  for (let v = 0; v < max + step; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

// 막대의 값 쪽 끝만 둥글린다. 바닥 쪽은 기준선에 붙어 있어야 길이를 견줄 수 있다
function barPath(x: number, y: number, w: number, h: number, round: "top" | "right" | "none") {
  const r = round === "none" ? 0 : Math.min(4, w / 2, h / 2);
  if (round === "top") return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  if (round === "right") return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  return `M${x},${y}H${x + w}V${y + h}H${x}Z`;
}

export function QueryChart({
  columns,
  rows,
  config,
  onChange,
  controls = true,
  compact = false,
}: {
  columns: string[];
  rows: Cell[][];
  // 주면 그 설정으로 시작한다(보드). 없으면 열을 보고 알맞은 기본값을 잡는다(콘솔)
  config?: ChartConfig;
  // 설정이 바뀔 때마다 알린다. 콘솔이 보드에 저장할 때 쓴다
  onChange?: (config: ChartConfig) => void;
  controls?: boolean;
  compact?: boolean;
}) {
  const numeric = useMemo(
    () => columns.map((_, i) => rows.some((r) => r[i] !== null) && rows.every((r) => r[i] === null || num(r[i]) !== null)),
    [columns, rows],
  );
  const numericIdx = useMemo(() => columns.map((_, i) => i).filter((i) => numeric[i]), [columns, numeric]);
  const firstText = columns.findIndex((_, i) => !numeric[i]);
  const [state, setState] = useState<ChartConfig>(() => config ?? { kind: firstText < 0 && rows.length === 1 ? "number" : "bar" });
  const [hover, setHover] = useState<number | null>(null);
  const update = (next: Partial<ChartConfig>) => {
    const merged = { ...state, ...next };
    setState(merged);
    onChange?.(merged);
  };

  const at = (name?: string | null) => (name ? columns.indexOf(name) : -1);
  const x = at(state.xCol) >= 0 ? at(state.xCol) : firstText >= 0 ? firstText : 0;
  const yDefault = numericIdx.find((i) => i !== x) ?? numericIdx[0];
  const y: number | "all" | undefined = state.yCol === ALL ? "all" : at(state.yCol) >= 0 && numeric[at(state.yCol)] ? at(state.yCol) : yDefault;
  const splitAt = at(state.splitCol);
  const split = y !== "all" && splitAt >= 0 && splitAt !== x && splitAt !== y ? splitAt : null;
  const kind = state.kind;

  const data = useMemo(() => {
    if (y === undefined || kind === "table" || kind === "number") return null;
    const cats: string[] = [];
    const seen = new Map<string, number>();
    const values = new Map<string, number[]>();
    const add = (series: string, cat: string, v: number) => {
      let pos = seen.get(cat);
      if (pos === undefined) {
        pos = cats.length;
        seen.set(cat, pos);
        cats.push(cat);
      }
      const list = values.get(series) ?? [];
      list[pos] = (list[pos] ?? 0) + v;
      values.set(series, list);
    };
    for (const row of rows) {
      const cat = row[x] ?? "(비어 있음)";
      if (y === "all") numericIdx.filter((i) => i !== x).forEach((i) => add(columns[i], cat, num(row[i]) ?? 0));
      else add(split === null ? columns[y] : (row[split] ?? "(비어 있음)"), cat, num(row[y]) ?? 0);
    }
    const shown = cats.slice(0, MAX_POINTS);
    // 나눌 기준이 여덟을 넘으면 합이 큰 일곱만 남기고 나머지는 '기타'로 묶는다. 색을 더 만들면 서로 구분되지 않는다
    let names = [...values.keys()];
    const total = (name: string) => (values.get(name) ?? []).reduce((a, b) => a + (b ?? 0), 0);
    let folded = false;
    if (names.length > MAX_SERIES) {
      const keep = [...names].sort((a, b) => total(b) - total(a)).slice(0, MAX_SERIES - 1);
      const rest = names.filter((n) => !keep.includes(n));
      const other: number[] = [];
      rest.forEach((n) => (values.get(n) ?? []).forEach((v, i) => (other[i] = (other[i] ?? 0) + (v ?? 0))));
      rest.forEach((n) => values.delete(n));
      values.set("기타", other);
      names = [...keep, "기타"];
      folded = true;
    }
    // 색은 이름에 붙인다(가나다순 자리). 기간을 바꿔 다시 조회해도 같은 이름이 같은 색을 갖는다
    const ordered = y === "all" || split === null ? names : names.filter((n) => n !== "기타").sort((a, b) => a.localeCompare(b, "ko")).concat(folded ? ["기타"] : []);
    let slot = 0;
    const series = ordered.map((name) => ({
      name,
      color: name === "기타" && folded ? OTHER : (FIXED[name] ?? PALETTE[slot++ % PALETTE.length]),
      values: shown.map((_, i) => values.get(name)?.[i] ?? 0),
    }));
    return { cats: shown, series, cut: cats.length > MAX_POINTS, total: cats.length, folded, stacked: split !== null };
  }, [rows, columns, x, y, split, numericIdx, kind]);

  const toolbar = controls && (
    <div className="adm-toolbar">
      <div className="adm-toolbar-group">
        <div className="adm-tabs" role="tablist" aria-label="차트 종류">
          {KINDS.map((k) => (
            <button key={k.kind} type="button" role="tab" aria-selected={kind === k.kind} onClick={() => update({ kind: k.kind })}>
              {k.label}
            </button>
          ))}
        </div>
      </div>
      {kind !== "table" && (
        <div className="adm-toolbar-group">
          {kind !== "number" && (
            <label className="adm-qchart-field">
              가로축
              <select className="adm-select" value={columns[x]} onChange={(e) => update({ xCol: e.target.value })}>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          <label className="adm-qchart-field">
            값
            <select className="adm-select" value={y === "all" ? ALL : y === undefined ? "" : columns[y]} onChange={(e) => update({ yCol: e.target.value })}>
              {numericIdx.map((i) => (
                <option key={i} value={columns[i]}>{columns[i]}</option>
              ))}
              {kind !== "number" && numericIdx.filter((i) => i !== x).length > 1 && <option value={ALL}>숫자 열 전체(나란히)</option>}
            </select>
          </label>
          {kind !== "number" && (
            <label className="adm-qchart-field">
              나눌 기준
              <select className="adm-select" value={split === null ? "" : columns[split]} disabled={y === "all"} onChange={(e) => update({ splitCol: e.target.value || null })}>
                <option value="">없음</option>
                {columns.map((c, i) => (i === x || i === y ? null : <option key={c} value={c}>{c}</option>))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );

  let body: React.ReactNode;
  if (!rows.length) {
    body = <p className="adm-muted" style={{ padding: "8px 2px 4px" }}>기간 안에 기록이 없습니다.</p>;
  } else if (kind === "table") {
    body = <ResultTable columns={columns} rows={rows} numeric={numeric} compact={compact} />;
  } else if (!numericIdx.length || y === undefined) {
    body = <p className="adm-notice" style={{ margin: 14 }}>숫자로 된 열이 없어 차트로 그릴 수 없습니다. count(*) 같은 값을 조회에 넣어 주세요.</p>;
  } else if (kind === "number") {
    // 숫자 하나를 읽는 일에는 차트가 아니라 숫자를 크게 둔다. 첫 행의 값을 쓴다
    const col = y === "all" ? numericIdx[0] : y;
    const v = num(rows[0]?.[col] ?? null);
    body = (
      <div className={compact ? "adm-qchart-number adm-qchart-number-compact" : "adm-qchart-number"}>
        <strong>{v === null ? "–" : fmt(v)}</strong>
        {!compact && <span>{columns[col]}</span>}
      </div>
    );
  } else if (!data || !data.cats.length) {
    body = <p className="adm-muted" style={{ padding: 14 }}>그릴 행이 없습니다.</p>;
  } else {
    body = <Plot data={data} kind={kind} hover={hover} setHover={setHover} compact={compact} title={`${columns[x]}별 ${y === "all" ? "숫자 열 전체" : columns[y]}`} />;
  }

  return (
    <div className="adm-qchart">
      {toolbar}
      <div className={compact ? "adm-qchart-body-compact" : "adm-panel-body"}>{body}</div>
    </div>
  );
}

type PlotData = {
  cats: string[];
  series: { name: string; color: string; values: number[] }[];
  cut: boolean;
  total: number;
  folded: boolean;
  stacked: boolean;
};

function Plot({
  data,
  kind,
  hover,
  setHover,
  compact,
  title,
}: {
  data: PlotData;
  kind: "bar" | "hbar" | "line";
  hover: number | null;
  setHover: (i: number | null) => void;
  compact: boolean;
  title: string;
}) {
  const { cats, series, stacked } = data;
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(DEFAULT_W);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setW(Math.max(320, Math.round(el.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const n = cats.length;
  const horizontal = kind === "hbar";
  const H = horizontal ? Math.max(compact ? 200 : 240, Math.min(560, n * 30 + 48)) : compact ? 260 : 320;
  const totals = cats.map((_, i) => series.reduce((a, s) => a + s.values[i], 0));
  const peak = Math.max(1, ...(stacked ? totals : series.flatMap((s) => s.values)));
  const ticks = niceTicks(peak);
  const top = ticks[ticks.length - 1];
  const labelW = horizontal ? Math.min(220, Math.max(60, Math.max(...cats.map((c) => short(c, 28).length)) * 7.4)) : 0;
  const m = { l: horizontal ? labelW + 10 : 46, r: horizontal ? 52 : 18, t: 16, b: horizontal ? 26 : 34 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const band = (horizontal ? ih : iw) / n;
  const groups = stacked || kind === "line" ? 1 : series.length;
  const thick = Math.max(2, Math.min(24, (band * 0.72 - (groups - 1) * 2) / groups));
  const scale = (v: number) => (v / top) * (horizontal ? iw : ih);
  const center = (i: number) => (horizontal ? m.t : m.l) + band * (i + 0.5);
  // 축 글자는 한 글자당 약 56px을 잡아 겹치지 않을 만큼만 적는다
  const every = horizontal ? Math.ceil(n / 30) : Math.max(1, Math.ceil(n / Math.max(4, Math.floor(iw / 56))));
  // 값은 하나를 셀 때(또는 쌓은 합계)만, 칸이 넉넉할 때만 적는다. 나머지는 올렸을 때 나오는 상자와 표가 맡는다
  const labelAll = (series.length === 1 || stacked) && n <= (horizontal ? 30 : 16);

  return (
    <>
      {/* 둘 이상을 견줄 때만 범례를 둔다. 하나뿐이면 제목이 이미 무엇인지 말한다. 이름 글자는 글자색, 색은 옆의 네모가 맡는다 */}
      {series.length > 1 && (
        <ul className="adm-qchart-legend">
          {series.map((s) => (
            <li key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <div ref={box} className="adm-qchart-plot" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${kind === "line" ? "선" : "막대"} 차트: ${title}`}>
          {ticks.map((t) => {
            const p = horizontal ? m.l + scale(t) : m.t + ih - scale(t);
            return (
              <g key={t}>
                {horizontal ? <line x1={p} x2={p} y1={m.t} y2={m.t + ih} className="adm-qchart-grid" /> : <line x1={m.l} x2={m.l + iw} y1={p} y2={p} className="adm-qchart-grid" />}
                <text x={horizontal ? p : m.l - 8} y={horizontal ? m.t + ih + 16 : p + 3.5} textAnchor={horizontal ? "middle" : "end"} className="adm-qchart-tick">
                  {fmt(t)}
                </text>
              </g>
            );
          })}
          {cats.map((c, i) =>
            i % every === 0 ? (
              <text key={`l${i}`} x={horizontal ? m.l - 10 : center(i)} y={horizontal ? center(i) + 3.5 : m.t + ih + 18} textAnchor={horizontal ? "end" : "middle"} className="adm-qchart-tick">
                {short(c, horizontal ? 28 : 9)}
              </text>
            ) : null,
          )}
          {kind === "line"
            ? series.map((s) => {
                const pts = s.values.map((v, i) => [center(i), m.t + ih - scale(v)] as const);
                const last = pts[pts.length - 1];
                return (
                  <g key={s.name}>
                    <path d={pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join("")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    <circle cx={last[0]} cy={last[1]} r={4} fill={s.color} className="adm-qchart-ring" />
                    {hover !== null && <circle cx={pts[hover][0]} cy={pts[hover][1]} r={4} fill={s.color} className="adm-qchart-ring" />}
                  </g>
                );
              })
            : cats.map((_, i) => {
                let acc = 0;
                const lastFilled = stacked ? series.reduce((pos, s, k) => (s.values[i] > 0 ? k : pos), -1) : -1;
                return (
                  <g key={`b${i}`}>
                    {series.map((s, k) => {
                      const v = s.values[i];
                      if (v <= 0) return null;
                      const len = scale(v);
                      const offset = stacked ? scale(acc) : 0;
                      if (stacked) acc += v;
                      const side = center(i) - (groups * thick + (groups - 1) * 2) / 2 + (stacked ? 0 : k * (thick + 2));
                      // 쌓인 조각 사이는 선을 긋지 않고 2px 띄운다. 맨 끝 조각만 둥글린다
                      const gap = stacked && k !== lastFilled && len > 3 ? 2 : 0;
                      const round = !stacked || k === lastFilled;
                      return horizontal ? (
                        <path key={s.name} d={barPath(m.l + offset, side, len - gap, thick, round ? "right" : "none")} fill={s.color} />
                      ) : (
                        <path key={s.name} d={barPath(side, m.t + ih - offset - len + gap, thick, len - gap, round ? "top" : "none")} fill={s.color} />
                      );
                    })}
                    {labelAll &&
                      totals[i] > 0 &&
                      (horizontal ? (
                        <text x={m.l + scale(totals[i]) + 6} y={center(i) + 3.5} className="adm-qchart-value">{fmt(totals[i])}</text>
                      ) : (
                        <text x={center(i)} y={m.t + ih - scale(totals[i]) - 6} textAnchor="middle" className="adm-qchart-value">{fmt(totals[i])}</text>
                      ))}
                  </g>
                );
              })}
          {horizontal ? <line x1={m.l} x2={m.l} y1={m.t} y2={m.t + ih} className="adm-qchart-axis" /> : <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} className="adm-qchart-axis" />}
          {kind === "line" && hover !== null && <line x1={center(hover)} x2={center(hover)} y1={m.t} y2={m.t + ih} className="adm-qchart-axis" />}
          {/* 올려 볼 수 있는 자리는 막대보다 넓게, 칸 전체로 잡는다. 키보드로도 칸을 옮겨 읽는다 */}
          {cats.map((c, i) => (
            <rect
              key={`h${i}`}
              x={horizontal ? m.l : m.l + band * i}
              y={horizontal ? m.t + band * i : m.t}
              width={horizontal ? iw : band}
              height={horizontal ? band : ih}
              fill="transparent"
              tabIndex={0}
              aria-label={`${c}: ${series.map((s) => `${s.name} ${fmt(s.values[i])}`).join(", ")}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            />
          ))}
        </svg>
        {hover !== null && hover < n && (
          <div
            // 가로 막대는 값이 막대 끝에 적혀 있어서, 설명 상자를 오른쪽 끝에 붙여 가리지 않게 한다
            className={horizontal ? "adm-qchart-tip adm-qchart-tip-end" : "adm-qchart-tip"}
            role="status"
            style={horizontal ? { left: "100%", top: `${(center(hover) / H) * 100}%` } : { left: `${Math.min(86, Math.max(14, (center(hover) / W) * 100))}%`, top: 0 }}
          >
            <strong>{cats[hover]}</strong>
            {series.map((s) => (
              <span key={s.name}>
                <i style={{ background: s.color }} />
                {series.length > 1 ? `${s.name} ` : ""}
                <b>{fmt(s.values[hover])}</b>
              </span>
            ))}
            {stacked && series.length > 1 && (
              <span className="adm-muted">
                합계 <b>{fmt(totals[hover])}</b>
              </span>
            )}
          </div>
        )}
      </div>
      {(data.cut || data.folded) && (
        <p className="adm-muted adm-qchart-note">
          {data.cut ? `가로축 항목 ${data.total}개 중 앞의 ${MAX_POINTS}개만 그렸습니다. ` : ""}
          {data.folded ? "나눌 기준이 여덟을 넘어 작은 것들을 '기타'로 묶었습니다." : ""}
        </p>
      )}
    </>
  );
}

// 표로 볼 때. 숫자 열은 오른쪽 정렬하고, 열 안에서 가장 큰 값 대비 길이를 칸 뒤에 옅게 깐다(같은 열끼리만 견준다)
function ResultTable({ columns, rows, numeric, compact }: { columns: string[]; rows: Cell[][]; numeric: boolean[]; compact: boolean }) {
  const max = columns.map((_, i) => (numeric[i] ? Math.max(0, ...rows.map((r) => num(r[i]) ?? 0)) : 0));
  if (!rows.length) return <p className="adm-muted" style={{ padding: 14 }}>조건에 맞는 행이 없습니다.</p>;
  return (
    <div className="adm-table-scroll" role="region" aria-label="차트 표" tabIndex={0} style={compact ? { maxHeight: 420 } : undefined}>
      <table className="adm-table adm-qchart-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c} className={numeric[i] ? "adm-numeric" : undefined}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => {
                const v = numeric[i] ? num(cell) : null;
                const share = v !== null && max[i] > 0 && i > 0 ? Math.round((v / max[i]) * 100) : 0;
                return (
                  <td key={i} className={numeric[i] ? "adm-numeric" : undefined} style={share ? ({ "--share": `${share}%` } as React.CSSProperties) : undefined} data-bar={share ? "" : undefined}>
                    {cell === null ? <span className="adm-muted">–</span> : v !== null ? fmt(v) : cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
