import type { Metadata } from "next";
import Link from "next/link";
import { getLearnEntries } from "@/features/learn/learn";
import { PageShell } from "@/features/site/page-shell";

export const metadata: Metadata = {
  title: "영어로 이럴 땐 이렇게 · 상황별 영어 표현 · nuanci",
  description: "화이팅, 수고하세요, 잘 부탁드립니다… 한국어로 하고 싶은 말을 영어로 그대로 옮기면 어떻게 들리는지, 원어민이 실제로 쓰는 말은 무엇인지 상황별로 정리했어요.",
  alternates: { canonical: "/learn" },
};

// 모든 표현 페이지로 가는 목차. 서버에서 글로 그려서 검색·AI 크롤러가 표현 페이지를 다 찾아가게 한다
export default async function LearnIndex() {
  const entries = await getLearnEntries();
  const byRelation = new Map<string, typeof entries>();
  for (const e of entries) byRelation.set(e.relation, [...(byRelation.get(e.relation) ?? []), e]);
  return (
    <PageShell title="영어로 이럴 땐 이렇게" note="상황별 표현" width="max-w-[760px]">
      <p className="text-body leading-relaxed text-fg-muted">
        한국어로 하고 싶은 말을 영어로 그대로 옮기면 상대에게 어떻게 들리는지, 원어민이 그 자리에서 실제로 쓰는 말은 무엇인지 모았어요. 각 표현은 nuanci 장면에서 직접 골라 볼 수 있어요.
      </p>
      {[...byRelation].map(([relation, list]) => (
        <section key={relation} className="mt-8">
          <h2 className="text-body font-bold">{relation}에게</h2>
          <ul className="mt-2 divide-y divide-line/60 border-y border-line/60">
            {list.map((e) => (
              <li key={e.slug}>
                <Link href={`/learn/${e.slug}`} className="flex min-h-11 items-center justify-between gap-3 py-2 text-note text-fg-muted hover:text-fg">
                  <span>「{e.ko}」</span>
                  <span className="text-right font-line text-fg">{e.right.line}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}
