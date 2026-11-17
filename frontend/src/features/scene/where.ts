import { spoken } from "@/features/collection/pairs";

// 장면 정보를 "친한 친구 · 동네 공원 · 오후"처럼 가운뎃점으로 잇지 않고 사람이 말하듯 한 문장으로 쓴다.
// 장소 값은 "동네 공원 · 오후"처럼 장소와 때가 붙어 오므로 둘로 나눠 쓴다

// 받침이 있으면 b(과·이), 없으면 a(와·가). 한글이 아니면 받침 없는 쪽으로 본다
function josa(word: string, a: string, b: string) {
  const c = word.trim().slice(-1).charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return a;
  return (c - 0xac00) % 28 ? b : a;
}

export function splitPlace(place: string) {
  const [loc, ...rest] = place.split("·").map((s) => s.trim());
  return { loc, time: rest.join(" ") || undefined };
}

// 장면 카드: "친한 친구와 동네 공원에서". 때(오후·밤)까지 붙이면 "오후 동네 공원"처럼 명사가 쌓여 읽기 어렵다.
// 때는 썸네일의 하늘·조명이 이미 보여 주므로 줄에서는 빼고, 칸이 나뉜 곳(대표 카드의 "언제")에만 둔다
export function sceneLine(relation: string, place: string) {
  return `${relation}${josa(relation, "와", "과")} ${splitPlace(place).loc}에서`;
}

// 표현 모음: 누구에게 한 말인지. "동네 공원에서 친한 친구에게", 후속 상황은 "조회수 3을 확인한 뒤, 친한 친구에게"
// 미리 만든 표현 모음(백엔드)에는 장소인지 표시가 없어서, 그때는 "장소 · 때" 꼴인지로 가른다
export function pairLine(who: string, when: string, whenIsPlace = when.includes("·")) {
  if (!whenIsPlace) return `${when}, ${who}에게`;
  return `${splitPlace(when).loc}에서 ${who}에게`;
}

// 완료 화면: 하고 싶던 말을 "~할 때"로. 따옴말이 있으면 「화이팅!」 할 때, 서술이면 "~싶을 때"
export function whenSaying(intent: string) {
  const i = intent.lastIndexOf(" 하고 ");
  if (i > 0) return `「${spoken(intent)}」 할 때`;
  return intent.replace(/\s*싶다\.?$/, " 싶을 때");
}

// 출처: "표현 출처 Cambridge Dictionary (energy, on fire)". 같은 사전은 한 번만 적는다
export function sourcesLine(sources: { phrase: string; from: string }[]) {
  const by = new Map<string, string[]>();
  for (const s of sources) by.set(s.from, [...(by.get(s.from) ?? []), s.phrase]);
  return [...by].map(([from, phrases]) => `${from} (${phrases.join(", ")})`).join(", ");
}
