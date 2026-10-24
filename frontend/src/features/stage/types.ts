export type SetId = "dining" | "office" | "cafe" | "living" | "street" | "park";
export type PropId = "blaster" | "phone" | "card" | "pudding" | "bag";
export type Time = "day" | "evening";
export type CastId = "me" | "sam" | "alex" | "barista" | "jordan" | "mochi" | "bori";

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
  hairStyle: "short" | "bun" | "curly" | "cap" | "none";
  glasses?: boolean;
  apron?: string;
  // 동물 캐릭터: 털색이 피부를 대신하고, 귀·꼬리·볼터치가 붙고, 머리가 커서 더 귀엽게 보인다
  animal?: { kind: "cat" | "bear"; fur: string; inner: string };
};
