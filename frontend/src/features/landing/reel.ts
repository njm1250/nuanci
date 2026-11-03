import type { Expression, Motion } from "@/features/scene/types";
import type { PropId, StageSpec } from "@/features/stage/types";

// 홈 데모 한 장면. 어떤 장면을 고를지는 백엔드 SceneViews.reel이 발행할 때 정한다
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
