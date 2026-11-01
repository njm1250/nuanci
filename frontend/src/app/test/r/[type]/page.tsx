import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { questionsVersion } from "@/features/typetest/model";
import { getTestQuestions } from "@/features/typetest/questions";
import { ResultView, TypeCard } from "@/features/typetest/result-view";
import { isTypeId, TYPE_IDS, TYPES } from "@/features/typetest/types";

export function generateStaticParams() {
  return TYPE_IDS.map((type) => ({ type }));
}

export async function generateMetadata({ params }: PageProps<"/test/r/[type]">): Promise<Metadata> {
  const { type } = await params;
  if (!isTypeId(type)) return {};
  const t = TYPES[type];
  const title = `${t.name} · 영어 사고 유형 테스트`;
  return {
    title: `${title} · nuanci`,
    description: `${t.tagline}. 너는 영어로 무슨 사고를 칠까? 8문제로 알아보세요.`,
    alternates: { canonical: `/test/r/${type}` },
    openGraph: { url: `/test/r/${type}`, title, description: `"${t.tagline}" 너는 무슨 유형? 8문제 · 문제당 10초` },
  };
}

// 결과 주소. 답 기록(?p=)은 브라우저에서 읽으므로, 그 전에는 유형 카드만 먼저 그려 둔다
async function Result({ params }: { params: PageProps<"/test/r/[type]">["params"] }) {
  const { type } = await params;
  if (!isTypeId(type)) notFound();
  const questions = await getTestQuestions();
  return (
    <Suspense fallback={<Shell>{<TypeCard type={type} kinds={null} avg={null} rarity={null} />}</Shell>}>
      <ResultView type={type} questions={questions} version={questionsVersion(questions)} />
    </Suspense>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep">
      <main className="w-full max-w-[480px] bg-night px-4 pb-12 pt-[68px]">{children}</main>
    </div>
  );
}

export default function ResultPage({ params }: PageProps<"/test/r/[type]">) {
  return (
    <Suspense fallback={<Shell />}>
      <Result params={params} />
    </Suspense>
  );
}
