export type SetId = "dining" | "office" | "cafe" | "living" | "street" | "park" | "elevator" | "store" | "karaoke" | "gym" | "room";
export type PropId = "blaster" | "phone" | "card" | "pudding" | "bag" | "mic" | "flowers" | "umbrella" | "coffee" | "cake" | "fish" | "gift" | "trophy";
export type Time = "day" | "evening";
export type CastId = "me" | "meGirl" | "sam" | "alex" | "barista" | "jordan" | "mochi" | "bori" | "boss" | "kong";

// 주인공. 사용자가 아지트에서 고른 모습으로 모든 장면에 나온다
export type Hero = "boy" | "girl";

// 주인공이 쓰는 꾸미기 아이템. 장면 내용에는 영향이 없고 겉모습만 바꾼다
export type AccessoryId = "cap" | "glasses" | "headphones" | "crown";

export type StageSpec = {
  set: SetId;
  hero?: Hero;
  accessory?: AccessoryId;
  // 아이템을 얻을 때 고른 색. 없으면 아이템 기본색
  accessoryColor?: string;
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
  accessory?: AccessoryId;
  accessoryColor?: string;
  // 동물 캐릭터: 털색이 피부를 대신하고, 귀·꼬리·볼터치가 붙고, 머리가 커서 더 귀엽게 보인다
  animal?: { kind: "cat" | "bear" | "dog"; fur: string; inner: string };
};
