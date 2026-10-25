export type SetId = "dining" | "office" | "cafe" | "living" | "street" | "park" | "elevator" | "store" | "karaoke" | "gym" | "room" | "plane" | "subway" | "classroom";
export type PropId = "blaster" | "phone" | "card" | "pudding" | "bag" | "mic" | "flowers" | "umbrella" | "coffee" | "cake" | "fish" | "gift" | "trophy";
export type Time = "day" | "evening";
export type CastId = "me" | "meGirl" | "sam" | "alex" | "barista" | "jordan" | "mochi" | "bori" | "boss" | "kong";

// 주인공. 사용자가 아지트에서 고른 모습으로 모든 장면에 나온다
export type Hero = "boy" | "girl";

// 주인공이 쓰는 꾸미기 아이템. 장면 내용에는 영향이 없고 겉모습만 바꾼다
export type AccessoryId =
  | "cap"
  | "glasses"
  | "headphones"
  | "crown"
  | "beanie"
  | "cat-ears"
  | "flower"
  | "sunglasses"
  | "scarf"
  | "bowtie"
  | "badge";

// 쓰고 있는 아이템과 얻을 때 고른 색. 색이 없으면 아이템 기본색
export type Worn = { id: AccessoryId; color?: string };

// 무대에 붙이는 소품 스티커(decor.tsx). 벽 소품은 (x, y)가 가운데, 바닥·가구 위 소품은 밑면 가운데다
export type DecorId =
  | "fridge"
  | "postit"
  | "calendar"
  | "picture"
  | "poster"
  | "whiteboard"
  | "menu"
  | "notice"
  | "aircon"
  | "multitap"
  | "cabinet"
  | "rice-cooker"
  | "shopping-bag"
  | "soju"
  | "cup-ramen"
  | "parcel"
  | "umbrella-stand"
  | "fan"
  | "tissue"
  | "mug"
  | "papers"
  | "slippers"
  | "tambourine"
  | "mochi"
  | "pudding";

export type Decor = { id: DecorId; x: number; y?: number; z?: number };

export type StageSpec = {
  set: SetId;
  hero?: Hero;
  wear?: Worn[];
  time: Time;
  partner: CastId;
  flags?: string[];
  // 세트 기본 소품 위에 이 장면에만 더 붙이는 소품. 기본 소품을 빼려면 flags에 "bare"를 넣는다
  decor?: Decor[];
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
  wear?: Worn[];
  // 동물 캐릭터: 털색이 피부를 대신하고, 귀·꼬리·볼터치가 붙고, 머리가 커서 더 귀엽게 보인다
  animal?: { kind: "cat" | "bear" | "dog"; fur: string; inner: string };
};
