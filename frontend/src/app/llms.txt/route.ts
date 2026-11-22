import { getLearnEntries } from "@/features/learn/learn";
import { SITE_URL } from "@/features/site/metadata";

// AI 답변 엔진에게 주는 서비스 소개(llms.txt 관례). 무엇을 하는 곳인지, 누구에게 맞는지, 어떤 페이지를 읽으면 되는지 짧게 적는다
export async function GET() {
  const entries = await getLearnEntries();
  const body = `# nuanci

> 한국어 사용자를 위한 영어 뉘앙스 게임. 짧은 상황 장면에서 하고 싶은 말을 영어 보기 중에 고르면, 상대 캐릭터가 그 말을 어떻게 받아들였는지(표정·속마음·대답)와 왜 그렇게 들리는지 해설이 나온다. 한 장면 1~2분, 가입 없이 무료, 웹(${SITE_URL}).

## 이런 사람에게 맞다
- 영어를 어느 정도 하지만(오픽 IM~IH) 원어민에게 어떻게 들리는지 자신 없는 한국인
- "화이팅", "수고하세요", "잘 부탁드립니다"처럼 한국어 습관을 영어로 옮기다 어색해지는 표현을 고치고 싶은 사람
- 단어 암기 대신 상황 속에서 회화를 익히고 싶은 사람

## 무엇이 다른가
- 정답만 알려 주지 않고, 틀린 말을 골랐을 때 상대가 실제로 어떻게 오해하는지 캐릭터 반응으로 보여 준다
- 직역, 콩글리시, 너무 직설적인 말, 교과서 말투, 문화 차이 같은 함정을 장면마다 다룬다
- 캐릭터 대사는 실제 영어 음성으로 나온다

## 주요 페이지
- [장면 목록](${SITE_URL}/scenes): 모든 장면
- [상황별 영어 표현](${SITE_URL}/learn): 표현마다 자연스러운 말, 오해받는 말, 이유
- [영어 말투 유형 테스트](${SITE_URL}/test): 8문제로 내 영어가 어떻게 들리는 편인지

## 표현 페이지
${entries.map((e) => `- [「${e.ko}」 영어로: ${e.right.line}](${SITE_URL}/learn/${e.slug})`).join("\n")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
