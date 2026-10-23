import type { Choice, Expression, Motion, Scene } from "@/features/scene/types";
import { GAG_MOTIONS } from "@/features/stage/catalog";
import type { PropId, StageSpec } from "@/features/stage/types";

export type ReelBeat = {
  stage: StageSpec;
  partnerLine: string;
  partnerIdle: Motion;
  partnerIdleProp?: PropId;
  ask: string;
  line: string;
  expression: Expression;
  motion: Motion;
  meMotion?: Motion;
  meProp?: PropId;
  partnerProp?: PropId;
  punch: string;
};

const funny = (c: Choice) => (GAG_MOTIONS.includes(c.motion) || c.meProp ? 1 : 0);

// 장면마다 직역 선택지 중 가장 웃긴 순간(과장된 동작·소품이 있는 쪽)을 골라 랜딩 데모로 쓴다
export function reelBeats(scenes: Scene[], count = 3): ReelBeat[] {
  return scenes.slice(0, count).flatMap((scene) => {
    const options = [scene.base, scene.followUp]
      .map((situation) => ({ situation, choice: situation.choices.find((c) => c.kind === "literal") }))
      .filter((o): o is { situation: typeof o.situation; choice: Choice } => Boolean(o.choice && o.situation.stage));
    const pick = options.sort((a, b) => funny(b.choice) - funny(a.choice))[0];
    if (!pick) return [];
    const { situation, choice } = pick;
    return [
      {
        stage: { ...situation.stage!, flags: [...(situation.stage!.flags ?? []), ...(choice.flags ?? [])] },
        partnerLine: situation.partnerLine,
        partnerIdle: situation.partnerIdle.motion,
        partnerIdleProp: situation.partnerIdle.prop,
        ask: choice.meaning,
        line: choice.line,
        expression: choice.expression,
        motion: choice.motion,
        meMotion: choice.meMotion,
        meProp: choice.meProp,
        partnerProp: choice.partnerProp,
        punch: choice.tags[1] ?? choice.reaction,
      },
    ];
  });
}
