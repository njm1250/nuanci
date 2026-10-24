export type SetId = "dining" | "office" | "cafe" | "living" | "street" | "park" | "elevator" | "store" | "karaoke" | "gym";
export type PropId = "blaster" | "phone" | "card" | "pudding" | "bag" | "mic" | "flowers" | "umbrella" | "coffee" | "cake" | "fish" | "gift" | "trophy";
export type Time = "day" | "evening";
export type CastId = "me" | "meGirl" | "sam" | "alex" | "barista" | "jordan" | "mochi" | "bori" | "boss" | "kong";

// 주인공. 장면마다 남자(boy)나 여자(girl)를 고를 수 있고 기본은 남자다
export type Hero = "boy" | "girl";

export type StageSpec = {
  set: SetId;
  hero?: Hero;
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
  hairStyle: "short" | "bun" | "curly" | "cap" | "long" | "none";
  glasses?: boolean;
  apron?: string;
  tie?: string;
  // 동물 캐릭터: 털색이 피부를 대신하고, 귀·꼬리·볼터치가 붙고, 머리가 커서 더 귀엽게 보인다
  animal?: { kind: "cat" | "bear" | "dog"; fur: string; inner: string };
};
