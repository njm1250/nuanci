"use client";

import { plex } from "../fonts";
import { PixelStage } from "../kit/pixel-stage";
import { RENDER_STYLES, type RenderStyle } from "../kit/render-styles";
import type { StageSpec } from "../kit/types";

const SPECS: StageSpec[] = [
  { set: "office", time: "day", partner: "alex" },
  { set: "dining", time: "evening", partner: "sam", flags: ["plate-empty"] },
  { set: "street", time: "evening", partner: "jordan" },
];

const STYLES: { id: RenderStyle; label: string }[] = [
  { id: "pixel", label: "지금 (픽셀 단색)" },
  { id: "mono", label: RENDER_STYLES.mono.label },
  { id: "riso", label: RENDER_STYLES.riso.label },
];

export default function StylesPage() {
  return (
    <main className={`${plex.className} mx-auto min-h-dvh max-w-5xl bg-[#f2f0eb] px-4 py-8 text-[#1b1b1a] break-keep`}>
      <h1 className="text-[22px] font-semibold">렌더 스타일 비교</h1>
      <p className="mt-1 text-[14px] text-[#1b1b1a]/60">같은 세트·인물을 렌더 방식만 바꿔서 그렸어요.</p>
      {STYLES.map((s) => (
        <section key={s.id} className="mt-8">
          <h2 className="text-[15px] font-semibold">{s.label}</h2>
          <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SPECS.map((spec) => (
              <li key={`${spec.set}-${spec.time}`} className="aspect-[4/3] border-2 border-[#1b1b1a]">
                <PixelStage spec={spec} render={s.id} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
