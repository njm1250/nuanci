export type SetId = "dining" | "office" | "cafe" | "living" | "street" | "park";
export type PropId = "blaster" | "phone" | "card" | "pudding" | "bag";
export type Time = "day" | "evening";
export type CastId = "me" | "sam" | "alex" | "barista" | "jordan";

export type StageSpec = {
  set: SetId;
  time: Time;
  partner: CastId;
  flags?: string[];
};

export type Placement = {
  x: number;
  z?: number;
  facing: number;
  posture: "sit" | "stand";
};

export type Look = {
  shirt: string;
  hair: string;
  hairStyle: "short" | "bun" | "curly" | "cap";
  glasses?: boolean;
  apron?: string;
};
