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

// 첫 방문에 바로 하게 될 앞쪽 장면은 데모에 쓰지 않는다. 데모에서 오답과 반응을 먼저 보면 정작 그 장면에서 틀리는 재미와 "처음 알았다"가 사라진다
const FIRST_SESSION = 10;

// 데모로 고른 순간: 한국 사람이 "이건 영어로도 통하겠지" 하고 쓰는 말(영어인 줄 아는 콩글리시)이 엉뚱하게 들리는 것.
// 아무도 통할 거라 생각하지 않는 직역이나 "the 하나 차이"처럼 설명을 들어야 웃긴 소재는 쓰지 않는다
// ask는 데모 위에 띄우는 한국어. 길면 일시정지 버튼과 말풍선을 가려서 핵심만 남긴다
const REEL_PICKS = [
  { scene: "battery-three-percent", choice: "consent", ask: "콘센트 어디 있어?" },
  { scene: "two-am-store", choice: "cider", ask: "사이다 어디 있어요?" },
  { scene: "water-is-self", choice: "water-is-self", ask: "물은 셀프야!" },
];

function beat(situation: Scene["base"], choice: Choice): ReelBeat {
  return {
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
  };
}

// 고른 순간을 데모로 쓰되, 순서가 바뀌어 앞쪽 장면이 됐거나 없어진 장면은 빼고 뒤쪽 장면의 가장 웃긴 X 선택지로 채운다
export function reelBeats(scenes: Scene[], count = 3): ReelBeat[] {
  const later = scenes.slice(FIRST_SESSION);
  const picked = REEL_PICKS.flatMap(({ scene: id, choice: choiceId, ask }) => {
    const scene = later.find((s) => s.id === id);
    const situation = scene && [scene.base, scene.followUp].find((x) => x.stage && x.choices.some((c) => c.id === choiceId));
    const choice = situation?.choices.find((c) => c.id === choiceId);
    return situation && choice ? [{ id, beat: { ...beat(situation, choice), ask } }] : [];
  });
  const fill = later
    .filter((s) => !picked.some((p) => p.id === s.id))
    .flatMap((scene) => {
      const options = [scene.base, scene.followUp]
        .map((situation) => ({ situation, choice: situation.choices.find((c) => c.verdict === "bad") }))
        .filter((o): o is { situation: typeof o.situation; choice: Choice } => Boolean(o.choice && o.situation.stage))
        .sort((a, b) => funny(b.choice) - funny(a.choice));
      return options[0] && funny(options[0].choice) ? [beat(options[0].situation, options[0].choice)] : [];
    });
  return [...picked.map((p) => p.beat), ...fill].slice(0, count);
}
