"use client";

import { useMemo, useState } from "react";
import { plex } from "../fonts";
import { PixelStage } from "../kit/pixel-stage";
import type { StageSpec } from "../kit/types";
import type { Choice, Scene } from "../scene";
import { SCENES } from "../scenes";
import { useCopyLink, useReducedMotion, useSceneFlow } from "../use-scene-flow";

const INK = "text-[#1b1b1a]";
const primary = "mt-8 w-full bg-[#1b1b1a] py-4 text-[15px] font-semibold text-[#f2f0eb] active:translate-y-px";

function Section({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={className}>
      <h2 className="text-[12px] font-semibold tracking-wide text-[#1b1b1a]/45">{label}</h2>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function Expander({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b-2 border-[#1b1b1a]">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between py-3.5 text-left text-[15px]">
        {label}
        <span className="text-[18px] leading-none">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="animate-[rise-in_180ms_ease-out] pb-4">{children}</div>}
    </div>
  );
}

function Steps({ second }: { second: boolean }) {
  const cell = (on: boolean) => `px-4 py-2 ${on ? "bg-[#1b1b1a] text-[#f2f0eb]" : "text-[#1b1b1a]/40"}`;
  return (
    <div className="grid grid-cols-2 border-b-2 border-[#1b1b1a] text-[12px] font-semibold">
      <div className={cell(!second)}>1 기본 상황</div>
      <div className={cell(second)}>2 만약에?</div>
    </div>
  );
}

function ChoiceList({ choices, onPick, showMeaning }: { choices: Choice[]; onPick: (id: string) => void; showMeaning: boolean }) {
  return (
    <ol className="border-t-2 border-[#1b1b1a]">
      {choices.map((c, i) => (
        <li key={c.id} className="border-b-2 border-[#1b1b1a]">
          <button onClick={() => onPick(c.id)} className="flex w-full items-start gap-3 py-4 text-left hover:bg-white">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center border-2 border-[#1b1b1a] text-[12px] font-semibold">{i + 1}</span>
            <span>
              <span className="block text-[18px] font-semibold leading-snug">{c.line}</span>
              {showMeaning && <span className="mt-0.5 block text-[14px] text-[#1b1b1a]/55">{c.meaning}</span>}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function ScenePlayer({ scene, onNext }: { scene: Scene; onNext: () => void }) {
  const f = useSceneFlow(scene);
  const reduced = useReducedMotion();
  const { state: copyState, copy } = useCopyLink();
  const [showMeaning, setShowMeaning] = useState(false);
  const [open, setOpen] = useState<"detail" | "others" | null>(null);
  const { situation, choice, phase } = f;
  const later = phase !== "base";
  const stageSituation = later ? scene.followUp : scene.base;

  const spec = useMemo<StageSpec>(() => {
    const base = stageSituation.stage!;
    return { ...base, flags: [...(base.flags ?? []), ...(choice?.flags ?? [])] };
  }, [stageSituation, choice]);

  const pick = (id: string) => {
    setOpen(null);
    f.pick(id);
  };

  return (
    <>
      <div className="aspect-[16/11] w-full border-y-2 border-[#1b1b1a]">
        <PixelStage
          spec={spec}
          reduced={reduced}
          state={{
            partnerMotion: choice?.motion ?? stageSituation.partnerIdle.motion,
            partnerKey: f.reactionKey * 10 + (later ? 1 : 0),
            talkKey: f.reactionKey,
            reaction: choice?.expression ?? null,
            meLine: choice?.line,
            partnerLine: stageSituation.partnerLine,
          }}
        />
      </div>
      <Steps second={later} />

      <main className="px-4 pb-14 pt-6">
        {phase === "transition" ? (
          <div key="transition" className="animate-[rise-in_220ms_ease-out]">
            <Section label="잠깐, 만약에?">
              <p className="text-[22px] font-semibold leading-snug">{scene.followUp.prompt.replace(/^잠깐,\s*/, "")}</p>
            </Section>
            <dl className="mt-6 grid grid-cols-[3rem_1fr] gap-y-2 border-y-2 border-[#1b1b1a] py-4 text-[15px]">
              <dt className="text-[#1b1b1a]/45">이전</dt>
              <dd className="text-[#1b1b1a]/50 line-through">{scene.followUp.from}</dd>
              <dt className="font-semibold">지금</dt>
              <dd className="font-semibold">{scene.followUp.to}</dd>
            </dl>
            <button onClick={f.enterFollowUp} className={primary}>
              다시 골라보기
            </button>
          </div>
        ) : !choice ? (
          <div key={`ask-${phase}`} className="animate-[rise-in_220ms_ease-out]">
            <Section label="상황">
              <p className="text-[17px] leading-relaxed">{situation.context}</p>
            </Section>
            <Section label="내 마음" className="mt-5">
              <p className="text-[16px] leading-relaxed">{situation.intent}</p>
            </Section>
            <Section label="뭐라고 말할까?" className="mt-8">
              <ChoiceList choices={situation.choices} onPick={pick} showMeaning={showMeaning} />
              <button onClick={() => setShowMeaning((v) => !v)} className="mt-3 text-[13px] underline underline-offset-4">
                {showMeaning ? "뜻 숨기기" : "뜻 보기"}
              </button>
            </Section>
          </div>
        ) : (
          <div key={`react-${choice.id}`} className="animate-[rise-in_220ms_ease-out]">
            <Section label="내가 한 말">
              <p className="text-[17px] font-semibold leading-snug">“{choice.line}”</p>
            </Section>
            <Section label={`${scene.partnerName}의 속마음`} className="mt-6">
              <p className="text-[22px] font-semibold leading-snug">{choice.reaction}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
                {choice.tags.map((t) => (
                  <span key={t} className="border-2 border-[#1b1b1a] px-1.5 py-0.5 font-semibold">
                    {t}
                  </span>
                ))}
              </div>
            </Section>
            <Section label="왜 그렇게 들릴까" className="mt-6">
              <p className="text-[16px] leading-relaxed text-[#1b1b1a]/85">{choice.why}</p>
            </Section>

            <div className="mt-6 border-t-2 border-[#1b1b1a]">
              <Expander label="더 자세히" open={open === "detail"} onToggle={() => setOpen(open === "detail" ? null : "detail")}>
                <p className="text-[15px] leading-relaxed text-[#1b1b1a]/85">{choice.detail}</p>
              </Expander>
              <Expander label="다른 말이라면?" open={open === "others"} onToggle={() => setOpen(open === "others" ? null : "others")}>
                <ul className="space-y-2">
                  {situation.choices
                    .filter((c) => c.id !== choice.id)
                    .map((c) => (
                      <li key={c.id}>
                        <button onClick={() => pick(c.id)} className="w-full border-2 border-[#1b1b1a] bg-white px-3 py-2.5 text-left">
                          <span className="block text-[16px] font-semibold">{c.line}</span>
                          <span className="text-[13px] text-[#1b1b1a]/60">{c.reaction}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </Expander>
            </div>

            {f.done ? (
              <>
                <div className="mt-8 border-2 border-[#1b1b1a] bg-white p-4">
                  <h2 className="text-[12px] font-semibold tracking-wide">오늘의 발견</h2>
                  <p className="mt-1.5 text-[17px] leading-relaxed">{scene.discovery}</p>
                </div>
                <button onClick={onNext} className={primary}>
                  다음 장면
                </button>
                <button onClick={copy} className="mt-2 w-full border-2 border-[#1b1b1a] py-3.5 text-[14px]">
                  {copyState === "copied" ? "링크를 복사했어요" : "친구는 뭐라고 할까? 링크 복사"}
                </button>
              </>
            ) : (
              <button onClick={f.startTransition} className={primary}>
                상황을 바꿔볼까요?
              </button>
            )}
          </div>
        )}
      </main>
    </>
  );
}

export function PixelPlayer() {
  const [index, setIndex] = useState(0);
  const scene = SCENES[index];
  return (
    <div className={`${plex.className} min-h-dvh bg-[#f2f0eb] ${INK} break-keep`}>
      <div className="mx-auto max-w-xl">
        <header className="flex h-12 items-center justify-between px-4">
          <span className="text-[15px] font-semibold">nuanci</span>
          <span className="text-[13px] text-[#1b1b1a]/55">
            장면 {scene.number} · {scene.title}
          </span>
        </header>
        <ScenePlayer key={scene.number} scene={scene} onNext={() => setIndex((i) => (i + 1) % SCENES.length)} />
      </div>
    </div>
  );
}
