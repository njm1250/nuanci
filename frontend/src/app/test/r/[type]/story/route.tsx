import { storyCard } from "@/features/typetest/cards";
import { answersOf, decodePicks, questionsVersion } from "@/features/typetest/model";
import { getTestQuestions } from "@/features/typetest/questions";
import { stampKind } from "@/features/typetest/stamps";
import { ingredients, isTypeId } from "@/features/typetest/types";

// 인스타 스토리용 세로 결과 이미지. 결과 화면의 '스토리 이미지' 버튼이 받아 간다
export async function GET(request: Request, { params }: RouteContext<"/test/r/[type]/story">) {
  const { type } = await params;
  if (!isTypeId(type)) return new Response("not found", { status: 404 });
  const url = new URL(request.url);
  const questions = await getTestQuestions();
  const picks = url.searchParams.get("v") === questionsVersion(questions) ? decodePicks(url.searchParams.get("p"), questions) : null;
  const answers = picks ? answersOf(questions, picks) : null;
  const image = await storyCard({
    type,
    kinds: answers?.map((a) => stampKind(a.verdict)) ?? null,
    avg: Number(url.searchParams.get("t")) || null,
    mix: answers ? ingredients(answers) : null,
  });
  image.headers.set("Content-Disposition", `inline; filename="nuanci-${type}.png"`);
  return image;
}
