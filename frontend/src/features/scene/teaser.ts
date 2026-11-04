import type { Scene } from "./types";

// 끝난 화면의 버튼에 다음 장면 예고로 쓴다("다음: 「이건 서비스예요!」 영어로?").
// 장면 하나를 끝낸 멈춤 지점에서, 모르는 게 하나 보여야 이어서 누를 호기심이 생긴다.
// 하고 싶은 말에서 따옴표로 뽑을 말이 있으면 그 말, 없으면 첫 질문 보기의 한국어 뜻, 둘 다 길면 장면 제목을 쓴다
const TEASER_MAX = 16;
export function teaserOf(s: Scene) {
  if (s.teaser) return s.teaser;
  const fit = (t: string | undefined) => (t && t.length <= TEASER_MAX ? t : null);
  const said = s.base.intent.match(/^(.+?)\s하고\s/)?.[1].trim();
  const meaning = s.base.choices.find((c) => c.verdict !== "good")?.meaning.replace(/\s*\(.*?\)/g, "").trim();
  const line = fit(said) ?? fit(meaning);
  return line ? `다음: 「${line}」 영어로?` : `다음: ${s.title}`;
}

// 장면 시작 버튼에 "장면 해 보기" 대신 이 장면에서 할 일을 적는다("엄마 말에 답하기"). 상대가 길면("동네 모임에서 알게 된 친구") 끝말만 쓴다
const CTA_RELATION_MAX = 8;
export function answerCta(relation: string) {
  const who = relation.length <= CTA_RELATION_MAX ? relation : relation.split(" ").at(-1);
  return who ? `${who} 말에 답하기` : "다음 장면 해 보기";
}
