import type { Expression, Motion } from "@/features/scene/types";
import type { AccessoryId, CastId, DecorId, PropId, SetId } from "./types";

// 장면 JSON에 쓸 수 있는 무대 값 목록. 관리자 에셋 화면에서 미리 보고 고를 때 쓴다
export const SET_IDS = ["dining", "office", "cafe", "living", "street", "park", "elevator", "store", "karaoke", "gym", "freezer", "sleephall", "room", "plane", "subway", "classroom", "clinic", "pharmacy", "bunsik", "salon", "boutique", "market", "studio"] as const satisfies readonly SetId[];
export const PARTNER_IDS = ["sam", "alex", "barista", "jordan", "mochi", "bori", "boss", "kong", "max", "mc", "mom", "snoozy", "grandpa"] as const satisfies readonly CastId[];
export const ACCESSORY_IDS = ["hair-1", "hair-2", "hair-3", "hair-4", "hair-5", "hair-6", "cap", "glasses", "headphones", "crown", "beanie", "cat-ears", "flower", "sunglasses", "scarf", "bowtie", "badge"] as const satisfies readonly AccessoryId[];
export const DECOR_IDS = [
  "fridge",
  "postit",
  "calendar",
  "picture",
  "poster",
  "whiteboard",
  "menu",
  "notice",
  "aircon",
  "multitap",
  "cabinet",
  "rice-cooker",
  "shopping-bag",
  "soju",
  "cup-ramen",
  "parcel",
  "umbrella-stand",
  "fan",
  "tissue",
  "mug",
  "papers",
  "slippers",
  "tambourine",
  "mochi",
  "pudding",
  "contest-poster",
  "bill-pile",
  "ice-block",
  "snow-pile",
  "thermometer",
  "tripod-cam",
  "ring-light",
  "massage-chair",
  "scooter",
  "junk-box",
  "sale-sign",
  "trade-sign",
] as const satisfies readonly DecorId[];
export const PROP_IDS = ["blaster", "phone", "card", "pudding", "bag", "mic", "flowers", "umbrella", "coffee", "cake", "fish", "gift", "trophy", "bill", "cheque", "clipboard", "pillow", "alarm", "clip", "pen", "camera", "key", "cash"] as const satisfies readonly PropId[];
export const EXPRESSIONS = ["neutral", "happy", "delighted", "puzzled", "awkward", "stuffed", "dizzy", "love", "angry", "shocked", "sleepy", "crying"] as const satisfies readonly Expression[];
export const MOTIONS = [
  "idle",
  "nod",
  "tilt",
  "bounce",
  "shrug",
  "patBelly",
  "lean",
  "aim",
  "point",
  "facepalm",
  "wave",
  "bow",
  "clap",
  "sob",
  "faint",
  "flop",
  "spin",
  "shiver",
  "dance",
  "panic",
] as const satisfies readonly Motion[];
// 과장된 동작은 장면당 1~2번만 쓴다
export const GAG_MOTIONS: readonly Motion[] = ["faint", "flop", "spin", "shiver", "dance", "panic"];
