"use client";

import { plex } from "../fonts";
import { CAST } from "./cast";
import { PixelStage } from "./pixel-stage";
import { SETS } from "./sets";
import type { StageSpec } from "./types";

const SAMPLES: { spec: StageSpec; scene: string }[] = [
  { spec: { set: "dining", time: "day", partner: "sam" }, scene: "9. 많이 먹어" },
  { spec: { set: "dining", time: "evening", partner: "sam", flags: ["plate-empty", "takeout"] }, scene: "9. 만약에 · 배부를 때" },
  { spec: { set: "office", time: "day", partner: "alex" }, scene: "1. 파일 보내달라고 하기" },
  { spec: { set: "cafe", time: "day", partner: "barista", flags: ["cup-ready"] }, scene: "4. 음료 주문하기" },
  { spec: { set: "living", time: "evening", partner: "jordan", flags: ["tissues"] }, scene: "18. 속상한 친구 위로하기" },
  { spec: { set: "street", time: "evening", partner: "jordan" }, scene: "14. 다음에 보자" },
];

export function KitGallery() {
  return (
    <main className={`${plex.className} mx-auto min-h-dvh max-w-4xl bg-[#f2f0eb] px-4 py-8 text-[#1b1b1a] break-keep`}>
      <h1 className="text-[22px] font-semibold">장면 키트</h1>
      <p className="mt-1 text-[14px] text-[#1b1b1a]/60">세트 × 시간 × 등장인물 × 소품 상태를 조합해서 장면을 만들어요.</p>
      <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {SAMPLES.map(({ spec, scene }) => (
          <li key={scene}>
            <div className="aspect-[16/11] border-2 border-[#1b1b1a]">
              <PixelStage spec={spec} />
            </div>
            <p className="mt-2 text-[14px] font-semibold">{scene}</p>
            <p className="font-mono text-[12px] text-[#1b1b1a]/55">
              {SETS[spec.set].label} · {spec.time === "day" ? "낮" : "저녁"} · {CAST[spec.partner].name}
              {spec.flags?.length ? ` · ${spec.flags.join(", ")}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
