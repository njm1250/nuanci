const FLAME = ["...o....", "...oo...", "..ooo.o.", ".oooooo.", ".ooyyoo.", "ooyyyyoo", "ooyyyyoo", ".oooooo."];

// 불꽃 아이콘. 오늘 했으면 불이 붙고, 아직이면 회색으로 꺼져 있다
export function Flame({ lit = true, size = 16 }: { lit?: boolean; size?: number }) {
  const fill = lit ? { o: "#f08a24", y: "#ffd27a" } : { o: "#6b6f78", y: "#9aa0aa" };
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden className="shrink-0">
      {FLAME.flatMap((row, y) => [...row].map((ch, x) => (ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[ch as "o" | "y"]} />)))}
    </svg>
  );
}

// 뱃지 색. 오래 이을수록 더 눈에 띄는 색이 된다
const TIERS: Record<number, string> = { 3: "#b4452f", 7: "#8c9296", 10: "#e8b931", 30: "#2f7f7a", 50: "#f08aa8", 100: "#3f73c9", 365: "#c8f02a" };

export function badgeLabel(days: number) {
  return `${days}일 연속`;
}

// 이름 옆에 다는 연속 기록 뱃지
export function StreakBadge({ days, dim = false }: { days: number; dim?: boolean }) {
  const color = TIERS[days] ?? "#e8b931";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 border-2 px-1.5 py-0.5 font-pixel text-[12px] leading-none ${dim ? "border-ink/25 text-ink-subtle" : "text-ink"}`}
      style={dim ? undefined : { background: color, borderColor: "#1b1b1a" }}
    >
      <Flame lit={!dim} size={10} />
      {days}일
    </span>
  );
}

// 완료 화면에서 오늘 처음 이어졌을 때 보여주는 한 줄. 불꽃이 튀어나오고 날 수가 올라간다
export function StreakMomentCard({ current, newBadge, reduced, delay }: { current: number; newBadge: number | null; reduced: boolean; delay: number }) {
  return (
    <div className="blk flex items-center gap-3 bg-night-deep px-3 py-3" style={reduced ? undefined : { animation: `rise 260ms ease-out ${delay}ms both` }}>
      <span className="grid size-12 shrink-0 place-items-center" style={reduced ? undefined : { animation: `reward-pop 520ms ease-out ${delay + 120}ms both` }}>
        <Flame size={40} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-pixel-title text-[20px] leading-[1.25] text-paper">{current === 1 ? "연속 첫날" : `${current}일 연속`}</p>
        <p className="text-[12px] text-paper-subtle">내일도 하면 {current + 1}일</p>
      </div>
      {newBadge && (
        <div className="shrink-0 text-right">
          <p className="font-pixel text-[12px] text-gold">새 뱃지</p>
          <div className="mt-1">
            <StreakBadge days={newBadge} />
          </div>
        </div>
      )}
    </div>
  );
}
