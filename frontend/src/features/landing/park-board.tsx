import { mochiPixels } from "@/features/mascot/mochi";
import { RewardIcon } from "@/features/rewards/reward-icon";

// 홈 '다음 10화까지'의 도트 그림. 공원 바닥에 디딤돌 10개를 놓고, Mochi가 마지막으로 끝낸 장면의 돌 위에 서 있다.
// 다음 보상 물건은 그 보상을 받는 장면의 돌 위에 놓여서, 보상까지 몇 장면 남았는지가 돌 몇 칸으로 보인다.
// 도트 그림이라 색은 그림 안에 직접 쓴다(무대·마스코트·보상 아이콘과 같은 예외)
const STONES = 10;
const STEP = 30;
const FIRST = 12;
const GROUND = 59;

const WALKED = { edge: "#42543f", top: "#a9c48c", front: "#91765e", side: "#6e5c4e" };
const AHEAD = { edge: "#a3abc4", top: "#ffffff", front: "#e3e7ee", side: "#c9cfdd" };

// 비스듬히 본 디딤돌 하나. 윗면·앞면·옆면을 1px 계단으로 그려 2.5D로 보이게 한다
function Stone({ x, c }: { x: number; c: typeof WALKED }) {
  return (
    <g transform={`translate(${x} ${GROUND})`}>
      <g fill={c.edge}>
        <rect x="6" width="20" height="12" />
        <rect x="4" y="2" width="20" height="12" />
        <rect x="2" y="4" width="20" height="12" />
        <rect y="6" width="20" height="12" />
      </g>
      <g fill={c.top}>
        <rect x="6" y="2" width="18" height="2" />
        <rect x="4" y="4" width="18" height="2" />
        <rect x="2" y="6" width="18" height="2" />
      </g>
      <rect x="2" y="10" width="16" height="6" fill={c.front} />
      <g fill={c.side}>
        <rect x="20" y="8" width="2" height="6" />
        <rect x="22" y="6" width="2" height="6" />
      </g>
    </g>
  );
}

const MOCHI = mochiPixels();

// 돌 i의 윗면 가운데 x(그림 좌표). 말풍선 위치도 이 값으로 맞춘다
export function stoneCenter(i: number) {
  return FIRST + i * STEP + 12;
}
export const BOARD_WIDTH = 320;

export function ParkBoard({ walked, rewardAt, rewardId, hopDelay }: { walked: number; rewardAt: number | null; rewardId: string | null; hopDelay: number }) {
  // Mochi는 마지막으로 끝낸 장면의 돌에 선다. 아직 하나도 안 끝냈으면 첫 돌 앞에 선다
  const at = walked - 1;
  const mochiX = at < 0 ? FIRST - 14 : stoneCenter(at) - 8;
  return (
    <svg viewBox={`0 0 ${BOARD_WIDTH} 88`} shapeRendering="crispEdges" aria-hidden className="block h-auto w-full bg-surface">
      <rect y="54" width={BOARD_WIDTH} height="34" fill="#e5ebe5" />
      {/* 뒤쪽 벤치와 풀잎은 흐리게 둬서 눈이 돌과 Mochi에 머문다 */}
      <g transform="translate(31 34)">
        <g fill="#aab5ac">
          <rect x="5" y="4" width="3" height="17" />
          <rect x="36" y="4" width="3" height="17" />
        </g>
        <g fill="#c9beb0">
          <rect x="2" width="40" height="5" />
          <rect x="2" y="7" width="40" height="4" />
        </g>
        <rect y="13" width="44" height="3" fill="#b5aea3" />
      </g>
      <g fill="#bccbbb">
        <rect x="94" y="51" width="2" height="4" />
        <rect x="97" y="49" width="2" height="5" />
        <rect x="278" y="52" width="2" height="3" />
        <rect x="281" y="49" width="2" height="5" />
      </g>
      {Array.from({ length: STONES }, (_, i) => (
        <Stone key={i} x={FIRST + i * STEP} c={i < walked ? WALKED : AHEAD} />
      ))}
      {rewardAt !== null && rewardId && rewardAt < STONES && (
        <g transform={`translate(${stoneCenter(rewardAt) - 7} ${GROUND - 9})`}>
          <RewardIcon id={rewardId} size={14} />
        </g>
      )}
      <g transform={`translate(${mochiX} ${GROUND - 12})`}>
        <g className="animate-hop" style={{ animationDelay: `${hopDelay}ms` }}>
          {MOCHI.map((p) => (
            <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1" height="1" fill={p.color} />
          ))}
        </g>
      </g>
    </svg>
  );
}
