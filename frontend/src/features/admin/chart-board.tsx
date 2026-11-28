import Link from "next/link";
import { deleteChart, moveChart, type AdminChart } from "./chart-actions";
import type { QueryResult } from "./query-actions";
import { QueryChart } from "./query-chart";

export type Board = {
  since: string;
  days: number;
  charts: { chart: AdminChart; result: QueryResult | null; error: string | null }[];
};

// 저장한 차트를 네 칸 격자에 놓는다. 숫자 하나짜리는 한 칸, 차트와 표는 두 칸이나 네 칸을 쓴다.
// 차트마다 SQL이 틀려도 그 칸에만 오류를 보여 주고 나머지는 그린다
export function ChartBoard({ board }: { board: Board }) {
  if (!board.charts.length)
    return (
      <p className="adm-notice">
        보드가 비어 있습니다. SQL 콘솔에서 조회를 돌리고 &lsquo;보드에 저장&rsquo;을 누르면 여기에 모입니다.
      </p>
    );
  return (
    <>
      <p className="adm-muted adm-board-since">
        {board.days === 0 ? "전체 기간" : `${board.since}부터 오늘까지`}
      </p>
      <div className="adm-board">
        {board.charts.map(({ chart, result, error }, i) => (
          <section key={chart.id} className={`adm-panel adm-board-cell${chart.kind === "number" ? " adm-board-number" : ""}`} style={{ gridColumn: `span ${chart.width}` }}>
            <header className="adm-board-head">
              <div>
                <h2>{chart.title}</h2>
                {chart.description && <p>{chart.description}</p>}
              </div>
              <details className="adm-board-menu">
                <summary aria-label={`${chart.title} 메뉴`}>⋯</summary>
                <div>
                  <Link href={`/admin/query?chart=${chart.id}`}>조회·차트 고치기</Link>
                  {i > 0 && (
                    <form action={moveChart}>
                      <input type="hidden" name="id" value={chart.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button type="submit">앞으로</button>
                    </form>
                  )}
                  {i < board.charts.length - 1 && (
                    <form action={moveChart}>
                      <input type="hidden" name="id" value={chart.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button type="submit">뒤로</button>
                    </form>
                  )}
                  <form action={deleteChart}>
                    <input type="hidden" name="id" value={chart.id} />
                    <button type="submit" className="adm-board-danger">
                      보드에서 지우기
                    </button>
                  </form>
                </div>
              </details>
            </header>
            {error ? (
              <p role="alert" className="adm-notice adm-notice-danger" style={{ margin: 14 }}>
                {error}
              </p>
            ) : result ? (
              <QueryChart columns={result.columns} rows={result.rows} config={chart} controls={false} compact />
            ) : null}
            {result?.truncated && <p className="adm-muted adm-qchart-note" style={{ padding: "0 14px 12px" }}>결과가 500행을 넘어 앞부분만 그렸습니다.</p>}
          </section>
        ))}
      </div>
    </>
  );
}
