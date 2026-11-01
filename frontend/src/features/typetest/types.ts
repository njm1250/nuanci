import type { Trap, Verdict } from "@/features/scene/types";

export type TypeId = "native" | "pudding" | "robot" | "konglish" | "jeong" | "hotel" | "boss" | "literal" | "delivery";

export type TypeInfo = {
  no: number;
  name: string;
  // 결과 카드 맨 위 한 줄. 이 유형이 어떤 사고를 치는지 상황으로 보여준다
  tagline: string;
  // 이 유형이 자주 하는 말. 친구 결과를 볼 때도 웃기게 읽히도록 짧은 영어 한 줄
  says: string;
  about: string;
  // 고치는 한 줄. 결과가 놀림으로 끝나지 않고 배울 거리 하나를 남긴다
  fix: string;
  // 둘이 같이 해외여행을 가면 이 유형이 저지를 일. 친구와 비교할 때 이어 붙인다
  trip: string;
};

export const TYPES: Record<TypeId, TypeInfo> = {
  native: {
    no: 1,
    name: "현지인 빙의형",
    tagline: "영어로 말하는데 눈치까지 원어민",
    says: "This one's on me.",
    about: "직역하고 싶은 마음을 꾹 참고 상황에 맞는 말을 골랐어요. 상대 속마음까지 읽는 타입이라, 친구들이 '너 유학 다녀왔어?' 하고 의심해요.",
    fix: "남은 건 더 어려운 장면뿐. 본편에서 사고 없는 연승에 도전해 보세요.",
    trip: "옆에서 통역을 맡아요",
  },
  pudding: {
    no: 2,
    name: "예스 노 반대형",
    tagline: "'응'이라고 했는데 '아니'로 들림",
    says: "Yes, I can't go.",
    about: "'안 와?'에 한국식으로 '응(안 가)'이라고 답하는 타입. 분명 대답했는데 상대는 온다는 건지 안 온다는 건지 몰라요. 억울함 지수 최상.",
    fix: "영어는 질문 모양 말고 사실대로 답해요. 안 가면 무조건 'No, I can't make it.'",
    trip: "안 먹은 음식 값을 물어 줘요",
  },
  robot: {
    no: 3,
    name: "교과서 로봇형",
    tagline: "I'm fine, thank you. And you? (삐빅)",
    says: "I'm fine, thank you. And you?",
    about: "문법은 완벽한데 대화가 면접 같아요. 머릿속 교과서를 검색하느라 대답이 반 박자 늦는 타입.",
    fix: "정답 문장 말고 짧게 반응해 보세요. 'Pretty good!', 'Not bad, you?'면 충분해요.",
    trip: "'And you?'만 세 번 물어요",
  },
  konglish: {
    no: 4,
    name: "콩글리시 네이티브형",
    tagline: "화이팅!을 외쳤더니 상대가 싸울 준비를 함",
    says: "Fighting!",
    about: "한국에서는 완벽히 통하는 영어 단어를 자신 있게 쓰는 타입. 자신감은 원어민급, 뜻은 한국 전용.",
    fix: "'화이팅'은 'You got this!', '서비스'는 'It's on the house.' 한국에서만 쓰는 영어부터 하나씩 바꿔 보세요.",
    trip: "식당에서 '서비스' 달라고 해요",
  },
  jeong: {
    no: 5,
    name: "K-정 과다형",
    tagline: "밥은 먹었어? 했다가 점심 약속이 잡힘",
    says: "Did you eat?",
    about: "정 많은 한국식 인사와 배려를 그대로 영어로 옮기는 타입. 마음은 따뜻한데 상대는 '왜 내 식사를 궁금해하지?' 해요.",
    fix: "인사는 'How's it going?', 배려는 'Help yourself!'처럼 그 나라 말버릇으로 옮겨 보세요.",
    trip: "처음 본 사람 밥까지 챙겨요",
  },
  hotel: {
    no: 6,
    name: "호텔 직원형",
    tagline: "친구한테도 'Certainly, sir.' 모드",
    says: "Enjoy your meal.",
    about: "예의 바른 건 좋은데 친구 사이에도 호텔 프런트처럼 말하는 타입. 상대는 팁을 줘야 하나 고민해요.",
    fix: "가까운 사이엔 짧고 가볍게. 'Enjoy!', 'Dig in!' 정도면 충분해요.",
    trip: "친구한테 체크인을 도와드려요",
  },
  boss: {
    no: 7,
    name: "본의 아닌 팀장님형",
    tagline: "부탁했을 뿐인데 업무 지시가 됨",
    says: "Please send me the file.",
    about: "'Please'를 붙였으니 공손하다고 믿는 타입. 듣는 사람은 결재 서류 받은 기분이에요. 본의는 아니었죠.",
    fix: "부탁은 질문 모양으로 부드럽게. 'Could you send me the file when you get a chance?'",
    trip: "가이드한테 업무 지시를 내려요",
  },
  literal: {
    no: 8,
    name: "직역 장인형",
    tagline: "한국어를 한 글자도 안 버리고 영어로 옮김",
    says: "I'll shoot today!",
    about: "'쏠게', '조심히 들어가'를 단어 그대로 옮기는 장인 정신의 소유자. 번역은 정확한데 뜻은 실종. 상대는 총을 찾아요.",
    fix: "단어 말고 하고 싶은 말을 옮겨요. '오늘은 내가 쏠게'는 'This one's on me.'",
    trip: "식당에서 '쏠게!'를 외쳐요",
  },
  delivery: {
    no: 9,
    name: "딴소리 제조형",
    tagline: "보낸 말은 맞는데 엉뚱한 뜻으로 도착",
    says: "Cheer up!",
    about: "틀린 말은 아닌데 상황에 안 맞거나 다른 뜻으로 들리는 타입. 응원했는데 위로가 되고, 칭찬했는데 의심이 돼요.",
    fix: "같은 말도 상황 따라 달리 들려요. 말하기 전에 '지금 상대 기분이 어떤가'부터 한 번만 확인!",
    trip: "응원하다가 위로를 해요",
  },
};

export const TYPE_IDS = Object.keys(TYPES) as TypeId[];

export function isTypeId(value: string): value is TypeId {
  return value in TYPES;
}

// 장면의 함정 9가지를 유형 8가지로 모은다. 맥락 어긋남과 다른 뜻으로 들림은 둘 다 '엉뚱하게 도착한 말'이라 한 유형으로 본다
export const TRAP_TYPE: Record<Trap, TypeId> = {
  answer: "pudding",
  textbook: "robot",
  konglish: "konglish",
  culture: "jeong",
  formal: "hotel",
  blunt: "boss",
  literal: "literal",
  context: "delivery",
  misread: "delivery",
};

// 한 문제의 답. 시간 안에 못 고르면 choice가 없다
export type Answer = { verdict: Verdict | null; trap?: Trap; ms: number };

// 한 문제만 빼고 다 자연스러워야 현지인 빙의형, 아니면 가장 많이 고른 함정 유형. 시간 초과는 '머릿속 교과서 검색 중'으로 보고 교과서 로봇형에 넣는다.
// 동점이 잦아서, 특정 유형에 쏠리지 않게 답의 조합으로 고른다. 같은 답이면 언제나 같은 결과가 나온다
export function scoreType(answers: Answer[]): TypeId {
  if (answers.filter((a) => a.verdict === "good").length >= answers.length - 1) return "native";
  const score = new Map<TypeId, number>();
  let seed = 0;
  answers.forEach((a, i) => {
    if (a.verdict === "good") return;
    const type = a.verdict === null ? "robot" : a.trap ? TRAP_TYPE[a.trap] : "literal";
    score.set(type, (score.get(type) ?? 0) + 1);
    seed += (i + 1) * (TYPES[type].no + 1);
  });
  const top = Math.max(...score.values());
  const tied = [...score.keys()].filter((t) => score.get(t) === top).sort((x, y) => TYPES[x].no - TYPES[y].no);
  return tied[seed % tied.length];
}

// 사고 성분표에 쓰는 이름. 함정 대신 유형 이름 앞부분을 써서 결과 카드와 말투를 맞춘다
export const INGREDIENTS: Record<TypeId, string> = {
  native: "자연스러움",
  pudding: "대답 방식",
  robot: "교과서",
  konglish: "콩글리시",
  jeong: "K-정",
  hotel: "과한 격식",
  boss: "직설",
  literal: "직역",
  delivery: "딴소리",
};

// 답을 성분별 비율로 나눈다. 많은 것부터. 시간 초과는 점수로는 교과서 로봇형에 넣지만 성분표에는 따로 적는다
export function ingredients(answers: Answer[]): { key: TypeId | "time"; label: string; share: number }[] {
  const count = new Map<TypeId | "time", number>();
  for (const a of answers) {
    const key = a.verdict === "good" ? "native" : a.verdict === null ? "time" : a.trap ? TRAP_TYPE[a.trap] : "literal";
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  return [...count]
    .map(([key, n]) => ({ key, label: key === "time" ? "얼음(시간 초과)" : INGREDIENTS[key], share: Math.round((n / answers.length) * 100) }))
    .sort((a, b) => b.share - a.share);
}

// 친구 유형과 나란히 놓았을 때 한 줄
export function pairLine(me: TypeId, friend: TypeId) {
  if (me === friend) return `사고 쌍둥이! 둘이 영어로 대화하면 아무도 못 알아들어요`;
  if (me === "native" || friend === "native") {
    const other = me === "native" ? friend : me;
    return `통역 담당 확정. ${TYPES[other].name}이 사고 치면 현지인 빙의형이 수습해요`;
  }
  return `같이 해외여행 가면: 나는 ${TYPES[me].trip}, 친구는 ${TYPES[friend].trip}`;
}
