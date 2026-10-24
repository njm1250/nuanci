import { MOCHI_SIZE, mochiPixels } from "./mochi";

const PIXELS = mochiPixels();

export function Mascot({ scale = 4, className = "" }: { scale?: number; className?: string }) {
  return (
    <svg width={MOCHI_SIZE.w * scale} height={MOCHI_SIZE.h * scale} viewBox={`0 0 ${MOCHI_SIZE.w} ${MOCHI_SIZE.h}`} shapeRendering="crispEdges" aria-hidden className={className}>
      {PIXELS.map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1" height="1" fill={p.color} />
      ))}
    </svg>
  );
}
