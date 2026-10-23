"use client";

import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { useMemo, useState } from "react";
import { pixelBody, pixelTitle } from "../fonts";
import { PixelStage } from "../kit/pixel-stage";
import type { StageSpec } from "../kit/types";
import type { Choice, Scene } from "../scene";
import { SCENES } from "../scenes";
import { useCopyLink, useReducedMotion, useSceneFlow } from "../use-scene-flow";

const INK = "#1b1b1a";

function BlockButton({
  children,
  onClick,
  gold = false,
  className = "",
  faceClassName = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  gold?: boolean;
  className?: string;
  faceClassName?: string;
}) {
  return (
    <button onClick={onClick} className={`blk-btn ${gold ? "blk-btn-gold" : ""} block ${className}`}>
      <span className={`blk block px-3 py-2.5 ${gold ? "bg-[#e1ad34]" : "bg-[#f7f3ea]"} ${faceClassName}`}>{children}</span>
    </button>
  );
}

function Panel({ children, className = "", dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={`blk-frame ${className}`}>
      <div className={`blk h-full ${dark ? "bg-[#1b1b1a] text-[#f2f0eb]" : "bg-[#efe9dc]"}`}>{children}</div>
    </div>
  );
}

// 상황 하나를 마칠 때마다 블록이 하나씩 쌓이는 진행 표시
function Blocks({ filled }: { filled: number }) {
  return (
    <div className="flex items-end gap-1.5" aria-label={`${filled}/2 완료`}>
      {[0, 1].map((i) => (
        <span key={`${i}-${i < filled}`} className={`blk-frame-sm ${i < filled ? "animate-[pop_260ms_ease-out]" : ""}`}>
          <span className={`block size-4 ${i < filled ? "bg-[#e1ad34] shadow-[inset_3px_3px_0_#f4d27a,inset_-3px_-3px_0_#a87a1c]" : "bg-[#3a4456]"}`} />
        </span>
      ))}
    </div>
  );
}

function Sheet({ choice, others, onPick, onClose }: { choice: Choice; others: Choice[]; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end bg-black/45 p-4 animate-[fade-in_150ms]" onClick={onClose}>
      <div className="w-full animate-[sheet-up_200ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        <Panel>
          <div className="max-h-[70dvh] overflow-y-auto p-5">
            <p className={`${pixelBody.className} text-[14px] text-[#1b1b1a]/55`}>왜 그렇게 들릴까?</p>
            <p className="pd mt-1.5 text-[15px] leading-relaxed">{choice.detail}</p>
            <p className={`${pixelBody.className} mt-6 text-[14px] text-[#1b1b1a]/55`}>다른 말이라면?</p>
            <ul className="mt-3 space-y-4">
              {others.map((c) => (
                <li key={c.id}>
                  <BlockButton onClick={() => onPick(c.id)} className="w-full text-left">
                    <span className="pd block text-[15px] font-semibold">{c.line}</span>
                    <span className="pd block text-[13px] text-[#1b1b1a]/55">{c.reaction}</span>
                  </BlockButton>
                </li>
              ))}
            </ul>
            <BlockButton onClick={onClose} className="mt-6 w-full" faceClassName={`${pixelBody.className} text-center text-[14px]`}>
              닫기
            </BlockButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ScenePlayer({ scene, onNext }: { scene: Scene; onNext: () => void }) {
  const f = useSceneFlow(scene);
  const reduced = useReducedMotion();
  const { state: copyState, copy } = useCopyLink();
  const [showMeaning, setShowMeaning] = useState(false);
  const [sheet, setSheet] = useState(false);
  const { situation, choice, phase } = f;
  const later = phase !== "base";
  const stageSituation = later ? scene.followUp : scene.base;
  const filled = f.done ? 2 : later ? 1 : 0;

  const spec = useMemo<StageSpec>(() => {
    const base = stageSituation.stage!;
    return { ...base, flags: [...(base.flags ?? []), ...(choice?.flags ?? [])] };
  }, [stageSituation, choice]);

  const pick = (id: string) => {
    setSheet(false);
    f.pick(id);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <p className={`${pixelBody.className} text-[14px] text-[#f2f0eb]`}>
          <span className="text-[#f2f0eb]/50">장면 {scene.number}</span>
          <span className="ml-2">{scene.title}</span>
        </p>
        <Blocks filled={filled} />
      </div>

      <div className="px-4">
        <Panel>
          <div className="relative aspect-[4/3] overflow-hidden">
            <PixelStage
              spec={spec}
              reduced={reduced}
              bubbleVariant="block"
              bubbleClassName="pd font-medium"
              state={{
                partnerMotion: choice?.motion ?? stageSituation.partnerIdle.motion,
                partnerKey: f.reactionKey * 10 + (later ? 1 : 0),
                talkKey: f.reactionKey,
                reaction: choice?.expression ?? null,
                meLine: choice?.line,
                partnerLine: stageSituation.partnerLine,
                meTurn: phase !== "transition" && !choice,
              }}
            />
            {later && (
              <p className={`${pixelBody.className} absolute bottom-2 left-2 animate-[fade-in_300ms] bg-[#1b1b1a] px-2 py-0.5 text-[13px] text-[#f2f0eb]`}>
                <span className="text-[#e1ad34]">만약에</span> {scene.followUp.to}
              </p>
            )}
            {phase === "transition" && !reduced && <div className="pointer-events-none absolute inset-0 animate-[wipe_520ms_ease-in-out_both] bg-[#1b1b1a]" />}
          </div>
        </Panel>
      </div>

      <section className="flex flex-1 flex-col px-4 pb-6 pt-5">
        {phase === "transition" ? (
          <div key="transition" className="flex flex-1 flex-col">
            <Panel>
              <div className="p-5">
                <p className={`${pixelBody.className} text-[14px] text-[#b4452f]`}>만약에…</p>
                <p className={`${pixelTitle.className} mt-1 text-[22px] leading-tight`}>{scene.followUp.prompt.replace(/^잠깐,\s*/, "")}</p>
                <p className="pd mt-3 text-[14px] text-[#1b1b1a]/60">
                  <s>{scene.followUp.from}</s> → <span className="text-[#1b1b1a]">{scene.followUp.to}</span>
                </p>
              </div>
            </Panel>
            <BlockButton gold onClick={f.enterFollowUp} className="mt-auto w-full" faceClassName={`${pixelBody.className} text-center text-[15px]`}>
              다시 골라보기
            </BlockButton>
          </div>
        ) : !choice ? (
          <div key={`ask-${phase}`} className="flex flex-1 flex-col">
            <p className="pd text-[14px] leading-relaxed text-[#f2f0eb]/60">{situation.context}</p>
            <p className={`${pixelTitle.className} mt-1.5 text-[22px] leading-tight text-[#f2f0eb]`}>{situation.intent}</p>
            <div className="mt-5 flex items-center justify-between">
              <span className={`${pixelBody.className} text-[14px] text-[#f2f0eb]/55`}>뭐라고 말할까?</span>
              <button onClick={() => setShowMeaning((v) => !v)} aria-pressed={showMeaning} className={`${pixelBody.className} text-[14px] text-[#e1ad34] underline underline-offset-4`}>
                {showMeaning ? "뜻 숨기기" : "뜻 보기"}
              </button>
            </div>
            <ul className="mt-3 space-y-4">
              {situation.choices.map((c, i) => (
                <li key={c.id}>
                  <BlockButton onClick={() => pick(c.id)} className="w-full text-left" faceClassName="flex items-center gap-3">
                    <span className={`${pixelBody.className} grid size-6 shrink-0 place-items-center bg-[#1b1b1a] text-[13px] text-[#f2f0eb]`}>{i + 1}</span>
                    <span>
                      <span className="pd block text-[16px] font-semibold leading-snug">{c.line}</span>
                      {showMeaning && <span className="pd block text-[13px] text-[#1b1b1a]/55">{c.meaning}</span>}
                    </span>
                  </BlockButton>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div key={`react-${choice.id}`} className="flex flex-1 flex-col">
            <Panel dark>
              <div className="p-4">
                <p className={`${pixelBody.className} text-[13px] text-[#f2f0eb]/50`}>{scene.partnerName}의 속마음</p>
                <p className={`${pixelTitle.className} mt-1 text-[22px] leading-tight`}>{choice.reaction}</p>
                <p className={`${pixelBody.className} mt-2 text-[13px] text-[#e1ad34]`}>{choice.tags.join(" · ")}</p>
                <p className="pd mt-2 text-[14px] leading-relaxed text-[#f2f0eb]/75">{choice.why}</p>
              </div>
            </Panel>
            {f.done && (
              <div className="mt-5 flex animate-[pop_320ms_ease-out] items-start gap-3">
                <span className="blk-frame-sm mt-0.5 shrink-0">
                  <span className="blk block size-7 bg-[#e1ad34] shadow-[inset_4px_4px_0_#f4d27a,inset_-4px_-4px_0_#a87a1c]" />
                </span>
                <div>
                  <p className={`${pixelBody.className} text-[14px] text-[#e1ad34]`}>발견 블록을 얻었어요</p>
                  <p className="pd mt-0.5 text-[15px] leading-relaxed text-[#f2f0eb]">{scene.discovery}</p>
                </div>
              </div>
            )}
            <div className="mt-auto flex gap-3 pt-6">
              <BlockButton onClick={() => setSheet(true)} faceClassName={`${pixelBody.className} text-[14px]`}>
                더 알아보기
              </BlockButton>
              {f.done ? (
                <>
                  <BlockButton onClick={copy} faceClassName={`${pixelBody.className} text-[14px]`}>
                    {copyState === "copied" ? "복사됨" : "공유"}
                  </BlockButton>
                  <BlockButton gold onClick={onNext} className="flex-1" faceClassName={`${pixelBody.className} text-center text-[15px]`}>
                    다음 장면
                  </BlockButton>
                </>
              ) : (
                <BlockButton gold onClick={f.startTransition} className="flex-1" faceClassName={`${pixelBody.className} text-center text-[15px]`}>
                  상황을 바꿔보기
                </BlockButton>
              )}
            </div>
          </div>
        )}
      </section>

      {sheet && choice && (
        <Sheet choice={choice} others={situation.choices.filter((c) => c.id !== choice.id)} onPick={pick} onClose={() => setSheet(false)} />
      )}
    </div>
  );
}

export function CraftPlayer() {
  const [index, setIndex] = useState(0);
  const scene = SCENES[index];
  return (
    <div className="pd flex min-h-dvh justify-center break-keep" style={{ background: "#1f2633", color: INK }}>
      <div className="flex h-dvh w-full max-w-[480px] flex-col bg-[#26303f]">
        <ScenePlayer key={scene.number} scene={scene} onNext={() => setIndex((i) => (i + 1) % SCENES.length)} />
      </div>
    </div>
  );
}
