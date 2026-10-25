import type { Metadata } from "next";
import { questionsVersion } from "@/features/typetest/model";
import { getTestQuestions } from "@/features/typetest/questions";
import { TestFlow } from "@/features/typetest/test-flow";

export const metadata: Metadata = {
  title: "영어 사고 유형 테스트 · nuanci",
  description: "상대가 한 말에 5문제만 답해 보세요. 직역 장인형, 푸딩 범인형, 콩글리시 네이티브형… 영어로 말할 때 내가 치는 사고 유형이 나와요.",
  alternates: { canonical: "/test" },
  openGraph: { url: "/test", title: "영어 사고 유형 테스트 · nuanci", description: "영어로 말할 때 너는 어떤 사고를 칠까? 5문제 · 문제당 10초" },
};

export default async function TestPage() {
  const questions = await getTestQuestions();
  return <TestFlow questions={questions} version={questionsVersion(questions)} />;
}
