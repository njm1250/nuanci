import type { TestQuestion } from "./model";

// 이 테스트만을 위해 쓴 문제. 본편 장면과 따로 두어 난이도와 함정 구성을 테스트에 맞춘다.
// 틀린 보기 16개가 유형 8가지를 정확히 두 번씩 담아서, 어느 유형이 나올지 문제 구성에 치우치지 않는다.
// 정답은 일부러 어렵게 잡았고, 현지인 빙의형은 8문제 중 7문제 이상 맞혀야 나온다
export const TEST_QUESTIONS: TestQuestion[] = [
  {
    id: "t1",
    title: "계산대 앞 눈치 싸움",
    partnerName: "Alex",
    partnerLine: "Should we split the bill?",
    intent: "오늘은 내가 살게! 하고 말하고 싶다.",
    choices: [
      { id: "t1-service", line: "No, this is my service.", meaning: "아니, 이건 내 서비스야.", verdict: "bad", trap: "konglish", reaction: "서비스…? 너 여기서 일해?" },
      { id: "t1-on-me", line: "No, it's on me.", meaning: "아니, 내가 낼게.", verdict: "good", reaction: "오! 다음엔 내가 살게!" },
      { id: "t1-give", line: "No. Give me the bill.", meaning: "아니. 계산서 내놔.", verdict: "meh", trap: "blunt", reaction: "어… 나 뭐 잘못했어?" },
    ],
  },
  {
    id: "t2",
    title: "읽씹 추궁",
    partnerName: "Bori",
    partnerLine: "Why didn't you text me back?",
    intent: "미안, 폰 배터리 나갔었어 하고 말하고 싶다.",
    choices: [
      { id: "t2-died", line: "Sorry, my phone died.", meaning: "미안, 폰 꺼졌었어.", verdict: "good", reaction: "아하! 충전기 좀 들고 다녀." },
      { id: "t2-battery", line: "Sorry, my battery went out.", meaning: "미안, 배터리가 나갔어.", verdict: "bad", trap: "literal", reaction: "건전지가 어디 나갔는데…? 언제 온대?" },
      { id: "t2-handphone", line: "Sorry, my handphone was off.", meaning: "미안, 핸드폰이 꺼져 있었어.", verdict: "meh", trap: "konglish", reaction: "핸드…폰? 아, 폰! 손에 드는 폰!" },
    ],
  },
  {
    id: "t3",
    title: "오늘 밤 약속",
    partnerName: "Jordan",
    partnerLine: "So you're not coming tonight?",
    intent: "응, 못 가 ㅠㅠ 하고 말하고 싶다.",
    choices: [
      { id: "t3-yes", line: "Yes, I can't go.", meaning: "응, 못 가.", verdict: "bad", trap: "answer", reaction: "온다는 거야, 못 온다는 거야?" },
      { id: "t3-promise", line: "No, I have a promise.", meaning: "아니, 약속 있어.", verdict: "bad", trap: "literal", reaction: "약속…? 누구랑 무슨 맹세를 했길래?" },
      { id: "t3-make-it", line: "No, I can't make it.", meaning: "응, 못 가.", verdict: "good", reaction: "아쉽다! 다음엔 꼭 와." },
    ],
  },
  {
    id: "t4",
    title: "동료에게 부탁하기",
    partnerName: "Alex",
    partnerLine: "Hey, what's up?",
    intent: "그 파일 좀 보내 줄 수 있어? 하고 편하게 부탁하고 싶다.",
    choices: [
      { id: "t4-please", line: "Please send me the file.", meaning: "파일 보내 주세요.", verdict: "meh", trap: "blunt", reaction: "넵… 결재 올리겠습니다." },
      { id: "t4-could", line: "Could you send me that file?", meaning: "그 파일 좀 보내 줄래?", verdict: "good", reaction: "그럼! 바로 보낼게." },
      { id: "t4-waiting", line: "I'm still waiting for your file.", meaning: "아직 네 파일을 기다리고 있어.", verdict: "bad", trap: "context", reaction: "헉, 나 지금 혼나는 거야?" },
    ],
  },
  {
    id: "t5",
    title: "한 상 차린 집들이",
    partnerName: "Sam",
    partnerLine: "Wow, you cooked all this?",
    intent: "차린 건 없지만 많이 먹어! 하고 말하고 싶다.",
    choices: [
      { id: "t5-nothing", line: "There's nothing to eat, but eat a lot!", meaning: "먹을 건 없지만 많이 먹어!", verdict: "bad", trap: "culture", reaction: "먹을 게 없다며? 이 상다리는 뭐야?" },
      { id: "t5-enjoy", line: "Please enjoy your meal, ma'am!", meaning: "손님, 맛있게 드십시오!", verdict: "meh", trap: "formal", reaction: "…여기 식당이었어? 팁 줘야 해?" },
      { id: "t5-help", line: "Yeah, help yourself!", meaning: "응, 마음껏 먹어!", verdict: "good", reaction: "좋았어, 사양 안 한다!" },
    ],
  },
  {
    id: "t6",
    title: "폰 없이 시간 묻기",
    partnerName: "Kong",
    partnerLine: "Hm? Did you need something?",
    intent: "실례지만 지금 몇 시예요? 하고 묻고 싶다.",
    choices: [
      { id: "t6-have-the-time", line: "Do you have the time?", meaning: "지금 몇 시예요?", verdict: "good", reaction: "3시요! 시계는 저도 없어서 폰 봤어요." },
      { id: "t6-have-time", line: "Do you have time?", meaning: "시간 있으세요?", verdict: "bad", trap: "misread", reaction: "시간…? 저 지금 작업 걸리는 건가요?" },
      { id: "t6-now", line: "Excuse me, what time is it now, please?", meaning: "실례합니다, 지금 몇 시입니까?", verdict: "meh", trap: "textbook", reaction: "오후 3시입니다. (안내 방송인 줄)" },
    ],
  },
  {
    id: "t7",
    title: "텅 빈 벤치",
    partnerName: "Kong",
    partnerLine: "Do you mind if I sit here?",
    intent: "네, 앉으세요! 하고 허락하고 싶다.",
    choices: [
      { id: "t7-seated", line: "Certainly. You may be seated.", meaning: "물론입니다. 착석하십시오.", verdict: "meh", trap: "formal", reaction: "…재판 시작하나요?" },
      { id: "t7-yes", line: "Yes, please sit.", meaning: "네, 앉으세요.", verdict: "bad", trap: "answer", reaction: "싫다는 거야, 앉으라는 거야?" },
      { id: "t7-go-ahead", line: "Not at all, go ahead.", meaning: "전혀요, 앉으세요.", verdict: "good", reaction: "고마워요! 벤치 친구 해요." },
    ],
  },
  {
    id: "t8",
    title: "카페 직원의 스몰토크",
    partnerName: "Barista",
    partnerLine: "How's your day going?",
    intent: "그럭저럭 괜찮아요 하고 가볍게 답하고 싶다.",
    choices: [
      { id: "t8-fine", line: "I'm fine, thank you. And you?", meaning: "저는 좋습니다, 감사합니다. 당신은요?", verdict: "meh", trap: "textbook", reaction: "…교과서 읽는 줄 알았어요." },
      { id: "t8-complain", line: "Can't complain.", meaning: "그럭저럭 괜찮아요.", verdict: "good", reaction: "좋네요! 라테 나왔어요." },
      { id: "t8-boss", line: "Not good. My boss yelled at me.", meaning: "별로요. 상사가 소리 질렀어요.", verdict: "meh", trap: "culture", reaction: "헉… 커피 드릴까요, 상담 드릴까요?" },
    ],
  },
];

export function getTestQuestions(): TestQuestion[] {
  return TEST_QUESTIONS;
}
