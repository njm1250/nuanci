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
const TIERS: Record<number, { face: string; ribbon: string }> = {
  3: { face: "#c9774a", ribbon: "#b4452f" },
  7: { face: "#b9c0c4", ribbon: "#3f73c9" },
  10: { face: "#e8b931", ribbon: "#b4452f" },
  30: { face: "#4fb0a6", ribbon: "#2d4a73" },
  50: { face: "#f08aa8", ribbon: "#7a3c21" },
  100: { face: "#8fb3f0", ribbon: "#1b1b1a" },
  365: { face: "#c8f02a", ribbon: "#1b1b1a" },
};

// 연속 기록 메달. 리본 아래 팔각 메달에 불꽃이 들어간다. locked면 아직 못 얻은 다음 목표라 회색이다
export function Medal({ days, size = 32, locked = false }: { days: number; size?: number; locked?: boolean }) {
  const tier = TIERS[days] ?? TIERS[10];
  const face = locked ? "#cfccc4" : tier.face;
  const ribbon = locked ? "#a9a59b" : tier.ribbon;
  const rim = locked ? "#8f8b82" : "#1b1b1a";
  const [o, y] = locked ? ["#a9a59b", "#e2dfd7"] : ["#f08a24", "#ffd27a"];
  const r = (x: number, yy: number, w: number, h: number, fill: string) => <rect key={`${x}-${yy}-${w}-${fill}`} x={x} y={yy} width={w} height={h} fill={fill} />;
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden className="shrink-0">
      {[r(2, 0, 3, 1, ribbon), r(3, 1, 3, 1, ribbon), r(4, 2, 2, 1, ribbon), r(7, 0, 3, 1, ribbon), r(6, 1, 3, 1, ribbon), r(6, 2, 2, 1, ribbon)]}
      {[r(3, 3, 6, 1, rim), r(2, 4, 8, 1, rim), r(1, 5, 10, 4, rim), r(2, 9, 8, 1, rim), r(3, 10, 6, 1, rim)]}
      {[r(3, 4, 6, 1, face), r(2, 5, 8, 4, face), r(3, 9, 6, 1, face)]}
      {[r(6, 5, 1, 1, o), r(5, 6, 2, 1, o), r(4, 7, 4, 2, o), r(5, 7, 2, 2, y)]}
    </svg>
  );
}

export function badgeLabel(days: number) {
  return `${days}일 연속`;
}

// 이름 옆에 다는 연속 기록 뱃지. 작은 메달과 날 수만 보여준다
export function StreakBadge({ days }: { days: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 font-pixel text-[15px] leading-none text-ink" aria-label={badgeLabel(days)}>
      <Medal days={days} size={16} />
      {days}일
    </span>
  );
}

// 완료 화면에서 오늘 처음 이어졌을 때 덧붙이는 한 줄. 그 장면의 발견을 가리지 않게 작게 보여주고, 불꽃만 살짝 튀어나온다
export function StreakMomentCard({ current, newBadge, reduced, delay }: { current: number; newBadge: number | null; reduced: boolean; delay: number }) {
  return (
    <div className="flex min-h-11 items-center gap-2.5" style={reduced ? undefined : { animation: `rise 260ms ease-out ${delay}ms both` }}>
      <span className="grid size-7 shrink-0 place-items-center" style={reduced ? undefined : { animation: `reward-pop 520ms ease-out ${delay + 120}ms both` }}>
        <Flame size={24} />
      </span>
      <p className="min-w-0 flex-1 font-pixel text-[15px] text-paper">
        {current === 1 ? "연속 첫날" : `${current}일 연속`}
        <span className="ml-2 font-sans text-[13px] text-paper-subtle">내일도 하면 {current + 1}일</span>
      </p>
      {newBadge && (
        <span className="flex shrink-0 items-center gap-1.5 font-pixel text-[15px] text-gold" style={reduced ? undefined : { animation: `reward-pop 520ms ease-out ${delay + 380}ms both` }}>
          <Medal days={newBadge} size={22} />
          새 뱃지
        </span>
      )}
    </div>
  );
}
