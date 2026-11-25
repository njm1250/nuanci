"use client";

import { useState } from "react";
import { SpeakerTag } from "./block-ui";
import { type Beat } from "./types";
import { Caret } from "./scene-parts";

// 대사 한 줄을 보여주는 시간. 영어가 익숙하지 않은 사람도 대사와 번역을 함께 읽을 수 있게 3.2~6.5초를 두고, 다 읽었으면 눌러서 바로 넘긴다
export const beatMs = (b: Beat) => Math.min(6500, Math.max(3200, 2200 + Math.max(b.line.length * 60, b.meaning.length * 70)));

// 대사가 몇 줄 남았는지 보여주는 점
export function BeatDots({ total, at }: { total: number; at: number }) {
  return (
    <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`size-1.5 ${i <= at ? "bg-ink" : "bg-ink/25"}`} />
      ))}
    </div>
  );
}

// 빌드업·이음 대사가 흐르는 동안 무대 아래에 쌓이는 대화 기록. 질문이 나오면 사라지고 지금의 질문 화면으로 돌아간다
// 번역은 영어 줄 아래에 작고 흐리게 같이 띄워서, 눈을 여러 번 옮기지 않고도 영어가 먼저 읽히게 한다. 상황 묘사("……")는 번역이 아니라서 번역을 꺼도 보인다
export function BeatLog({ beats, partnerName, translate }: { beats: Beat[]; partnerName: string; translate: boolean }) {
  return (
    <div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-2.5">
        {beats.map((b, i) => (
          <div key={i} className={`col-span-2 grid animate-rise grid-cols-subgrid items-baseline ${i < beats.length - 1 ? "beat-past" : ""}`}>
            <SpeakerTag me={b.who === "me"}>{b.who === "me" ? "나" : b.who === "mochi" ? "Mochi" : partnerName}</SpeakerTag>
            {b.line === "……" ? (
              <p className="min-w-0 text-body leading-snug text-fg-muted">{b.meaning}</p>
            ) : (
              <p className="min-w-0">
                <span className="block font-line text-say leading-snug text-fg">{b.line}</span>
                {translate && <span className="mt-0.5 block text-note leading-snug text-fg-muted">{b.meaning}</span>}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 질문이 나오면 빌드업 대사가 사라져서, 잠깐 한눈판 사람은 무슨 일이 있었는지 모른 채 골라야 했다. 접어 둔 채로 다시 펼쳐 볼 수 있게 남긴다
export function LeadRecap({ beats, partnerName, translate, aside }: { beats: Beat[]; partnerName: string; translate: boolean; aside?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="-mx-1 flex min-h-9 items-center gap-1.5 px-1 text-meta text-fg-subtle underline decoration-fg-subtle/40 underline-offset-4 hover:text-fg">
          {open ? "앞 대화 접기" : "앞 대화 다시 보기"}
          <Caret open={open} />
        </button>
        {aside}
      </div>
      {open && (
        <div className="mb-2 mt-1 animate-fade border-l-2 border-line pl-3">
          <BeatLog beats={beats} partnerName={partnerName} translate={translate} />
        </div>
      )}
    </div>
  );
}
