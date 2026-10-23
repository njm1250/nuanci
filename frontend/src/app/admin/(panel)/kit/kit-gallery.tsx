"use client";

import { useState } from "react";
import { Panel } from "@/features/scene/block-ui";
import type { Expression, Motion } from "@/features/scene/types";
import { EXPRESSIONS, GAG_MOTIONS, MOTIONS, PARTNER_IDS, PROP_IDS, SET_IDS } from "@/features/stage/catalog";
import { PixelStage } from "@/features/stage/pixel-stage";
import type { CastId, PropId, SetId, Time } from "@/features/stage/types";

function Pick<T extends string>({ label, value, options, onChange, mark }: { label: string; value: T | ""; options: readonly T[]; onChange: (v: T | "") => void; mark?: readonly string[] }) {
  return (
    <label className="block font-pixel text-[15px] text-paper-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T | "")} className="blk mt-1 block w-full bg-cream px-2 py-2 text-[14px] text-ink">
        <option value="">없음</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {mark?.includes(o) ? `★ ${o}` : o}
          </option>
        ))}
      </select>
    </label>
  );
}

// 무대 값 조합을 바로 그려 보는 관리자용 갤러리
export function KitGallery() {
  const [set, setSet] = useState<SetId>("dining");
  const [time, setTime] = useState<Time>("day");
  const [partner, setPartner] = useState<CastId>("sam");
  const [motion, setMotion] = useState<Motion | "">("idle");
  const [expression, setExpression] = useState<Expression | "">("");
  const [partnerProp, setPartnerProp] = useState<PropId | "">("");
  const [meMotion, setMeMotion] = useState<Motion | "">("");
  const [meProp, setMeProp] = useState<PropId | "">("");
  const [key, setKey] = useState(1);
  const replay = () => setKey((k) => k + 1);

  const snippet = {
    stage: { set, time, partner },
    motion: motion || "idle",
    ...(expression && { expression }),
    ...(meMotion && { meMotion }),
    ...(meProp && { meProp }),
    ...(partnerProp && { partnerProp }),
  };

  return (
    <div className="mt-6 space-y-5">
      <Panel>
        <div className="aspect-[4/3] w-full overflow-hidden">
          <PixelStage
            spec={{ set, time, partner }}
            state={{
              partnerMotion: motion || "idle",
              partnerKey: key,
              talkKey: 0,
              reaction: expression || null,
              meMotion: meMotion || undefined,
              meKey: key,
              meProp: meProp || undefined,
              partnerProp: partnerProp || undefined,
              partnerLine: "Partner line",
            }}
          />
        </div>
      </Panel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Pick label="무대 set" value={set} options={SET_IDS} onChange={(v) => v && setSet(v)} />
        <Pick label="시간 time" value={time} options={["day", "evening"] as const} onChange={(v) => v && setTime(v)} />
        <Pick label="상대 partner" value={partner} options={PARTNER_IDS} onChange={(v) => v && setPartner(v)} />
        <Pick label="상대 동작 motion" value={motion} options={MOTIONS} mark={GAG_MOTIONS} onChange={(v) => (setMotion(v), replay())} />
        <Pick label="표정 expression" value={expression} options={EXPRESSIONS} onChange={(v) => (setExpression(v), replay())} />
        <Pick label="상대 소품 partnerProp" value={partnerProp} options={PROP_IDS} onChange={setPartnerProp} />
        <Pick label="내 동작 meMotion" value={meMotion} options={MOTIONS} mark={GAG_MOTIONS} onChange={(v) => (setMeMotion(v), replay())} />
        <Pick label="내 소품 meProp" value={meProp} options={PROP_IDS} onChange={setMeProp} />
      </div>
      <button type="button" onClick={replay} className="blk-btn blk-btn-gold block w-full">
        <span className="blk block bg-gold px-3 py-3 text-center font-pixel text-[15px] text-ink">동작 다시 보기</span>
      </button>
      <pre className="blk overflow-x-auto bg-ink p-3 font-mono text-[13px] leading-relaxed text-paper">{JSON.stringify(snippet, null, 2)}</pre>
    </div>
  );
}
