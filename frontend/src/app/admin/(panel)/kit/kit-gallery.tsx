"use client";

import { useState } from "react";
import { AdminPanel } from "@/features/admin/ui";
import type { Expression, Motion } from "@/features/scene/types";
import {
  ACCESSORY_IDS,
  DECOR_IDS,
  EXPRESSIONS,
  GAG_MOTIONS,
  MOTIONS,
  PARTNER_IDS,
  PROP_IDS,
  SET_IDS,
} from "@/features/stage/catalog";
import { Stage } from "@/features/stage/stage";
import type {
  AccessoryId,
  CastId,
  DecorId,
  Hero,
  PropId,
  SetId,
  Time,
} from "@/features/stage/types";

function Pick<T extends string>({
  label,
  value,
  options,
  onChange,
  mark,
}: {
  label: string;
  value: T | "";
  options: readonly T[];
  onChange: (v: T | "") => void;
  mark?: readonly string[];
}) {
  return (
    <label className="block text-[12px] text-ink-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        className="adm-select mt-1 block w-full"
      >
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
  const [hero, setHero] = useState<Hero>("boy");
  const [accessory, setAccessory] = useState<AccessoryId | "">("");
  const [partner, setPartner] = useState<CastId>("sam");
  const [motion, setMotion] = useState<Motion | "">("idle");
  const [expression, setExpression] = useState<Expression | "">("");
  const [partnerProp, setPartnerProp] = useState<PropId | "">("");
  const [meMotion, setMeMotion] = useState<Motion | "">("");
  const [meProp, setMeProp] = useState<PropId | "">("");
  const [decor, setDecor] = useState<DecorId | "">("");
  const [decorX, setDecorX] = useState(0);
  const [key, setKey] = useState(1);
  const replay = () => setKey((k) => k + 1);

  const snippet = {
    ...(hero !== "boy" && { hero }),
    stage: {
      set,
      time,
      partner,
      ...(decor && { decor: [{ id: decor, x: decorX }] }),
    },
    motion: motion || "idle",
    ...(expression && { expression }),
    ...(meMotion && { meMotion }),
    ...(meProp && { meProp }),
    ...(partnerProp && { partnerProp }),
  };

  return (
    <div className="adm-kit-layout">
      <div className="adm-kit-stage">
        <AdminPanel title="무대 미리보기">
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <Stage
              spec={{
                set,
                time,
                partner,
                hero,
                wear: accessory ? [{ id: accessory }] : undefined,
                decor: decor ? [{ id: decor, x: decorX }] : undefined,
              }}
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
        </AdminPanel>
        <button
          type="button"
          onClick={replay}
          className="adm-btn adm-btn-primary"
          style={{ marginTop: 14 }}
        >
          동작 다시 보기
        </button>
        <pre
          className="adm-code"
          style={{ overflow: "auto", padding: 16, marginTop: 16 }}
        >
          {JSON.stringify(snippet, null, 2)}
        </pre>
      </div>
      <AdminPanel
        title="무대 조합"
        description="선택한 조합이 왼쪽 무대와 JSON에 반영됩니다."
      >
        <div className="adm-panel-body grid grid-cols-2 gap-4">
          <Pick
            label="무대 set"
            value={set}
            options={SET_IDS}
            onChange={(v) => v && setSet(v)}
          />
          <Pick
            label="시간 time"
            value={time}
            options={["day", "evening"] as const}
            onChange={(v) => v && setTime(v)}
          />
          <Pick
            label="주인공 hero"
            value={hero}
            options={["boy", "girl"] as const}
            onChange={(v) => v && setHero(v)}
          />
          <Pick
            label="주인공 아이템"
            value={accessory}
            options={ACCESSORY_IDS}
            onChange={setAccessory}
          />
          <Pick
            label="상대 partner"
            value={partner}
            options={PARTNER_IDS}
            onChange={(v) => v && setPartner(v)}
          />
          <Pick
            label="상대 동작 motion"
            value={motion}
            options={MOTIONS}
            mark={GAG_MOTIONS}
            onChange={(v) => (setMotion(v), replay())}
          />
          <Pick
            label="표정 expression"
            value={expression}
            options={EXPRESSIONS}
            onChange={(v) => (setExpression(v), replay())}
          />
          <Pick
            label="상대 소품 partnerProp"
            value={partnerProp}
            options={PROP_IDS}
            onChange={setPartnerProp}
          />
          <Pick
            label="내 동작 meMotion"
            value={meMotion}
            options={MOTIONS}
            mark={GAG_MOTIONS}
            onChange={(v) => (setMeMotion(v), replay())}
          />
          <Pick
            label="내 소품 meProp"
            value={meProp}
            options={PROP_IDS}
            onChange={setMeProp}
          />
          <Pick
            label="소품 스티커 decor"
            value={decor}
            options={DECOR_IDS}
            onChange={setDecor}
          />
          <label className="block text-[12px] text-ink-muted">
            스티커 위치 x ({decorX.toFixed(1)})
            <input
              type="range"
              min={-2.6}
              max={2.6}
              step={0.1}
              value={decorX}
              onChange={(e) => setDecorX(Number(e.target.value))}
              className="mt-3 block w-full"
            />
          </label>
        </div>
      </AdminPanel>
    </div>
  );
}
