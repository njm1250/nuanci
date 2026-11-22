import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLearnEntries, getLearnEntry, type LearnEntry } from "@/features/learn/learn";
import { pairLine, sourcesLine } from "@/features/scene/where";
import { PageShell } from "@/features/site/page-shell";
import { BlockLink } from "@/features/scene/block-ui";
import { MapPin } from "@/features/site/map-pin";
import { SITE_URL } from "@/features/site/metadata";
import type { Choice } from "@/features/scene/types";

export async function generateStaticParams() {
  return (await getLearnEntries()).map((e) => ({ slug: e.slug }));
}

const titleOf = (e: LearnEntry) => `「${e.ko}」 영어로? ${e.right.line.replace(/[.!?]+$/, "")}`;
const descriptionOf = (e: LearnEntry) => `${e.wrongs[0].line} 대신 ${e.right.line} — ${e.right.why}`;

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const e = await getLearnEntry((await params).slug);
  if (!e) return { title: "nuanci" };
  const title = `${titleOf(e)} · nuanci`;
  const description = descriptionOf(e).slice(0, 160);
  return { title, description, alternates: { canonical: `/learn/${e.slug}` }, openGraph: { url: `/learn/${e.slug}`, title, description } };
}

// 검색·AI 답변이 그대로 인용할 수 있게 "질문 하나, 답 하나"로 적는다
function learnLd(e: LearnEntry) {
  const url = `${SITE_URL}/learn/${e.slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `${e.relation}에게 「${e.ko}」를 영어로 어떻게 말해요?`,
          acceptedAnswer: { "@type": "Answer", text: `${e.right.line} ${e.right.why} ${e.wrongs.map((w) => `'${w.line}'는 ${w.tags[1] ?? w.tags[0] ?? "어색하게 들려요"}.`).join(" ")}` },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: titleOf(e),
      url,
      inLanguage: ["ko", "en"],
      learningResourceType: "explanation",
      isAccessibleForFree: true,
      about: { "@type": "Thing", name: "영어 회화 뉘앙스" },
      provider: { "@type": "Organization", name: "nuanci", url: SITE_URL },
    },
  ];
}

function Mark({ verdict }: { verdict: Choice["verdict"] }) {
  const [label, bg] = verdict === "good" ? ["O", "bg-good"] : verdict === "meh" ? ["△", "bg-warn"] : ["X", "bg-bad"];
  return <span className={`grid size-6 shrink-0 place-items-center font-label text-ui leading-none text-ink ${bg}`}>{label}</span>;
}

// 표현 하나의 공개 페이지. 상황 → 자연스러운 말과 이유 → 오해받는 말과 상대 반응 → 출처 → 장면 해 보기
export default async function LearnPage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const e = await getLearnEntry(slug);
  if (!e) notFound();
  const others = (await getLearnEntries()).filter((o) => o.slug !== e.slug && o.relation === e.relation).slice(0, 6);
  return (
    <PageShell title={`「${e.ko}」 영어로?`} note="이럴 땐 이렇게" backFallback="/learn" width="max-w-[760px]">
      {learnLd(e).map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      <p className="flex items-center gap-1.5 text-meta text-fg-subtle">
        <MapPin />
        {pairLine(e.relation, e.when, e.step === "base")}
      </p>
      <p className="mt-2 text-body leading-relaxed text-fg-muted">{e.context}</p>
      <p className="mt-3 text-body text-fg-muted">
        <span className="font-bold text-fg">{e.partnerName}</span> “<span className="font-line text-fg">{e.partnerLine}</span>”
      </p>

      <section className="mt-8 border-2 border-fg bg-card p-4 text-ink md:p-5">
        <h2 className="text-meta text-ink-subtle">자연스럽게 들리는 말</h2>
        <p className="mt-2 flex items-start gap-2">
          <Mark verdict="good" />
          <span className="font-line text-say-lg leading-snug">{e.right.line}</span>
        </p>
        {e.alts.map((a) => (
          <p key={a.id} className="mt-1 pl-8 font-line text-body text-ink-muted">
            <span className="font-sans text-meta text-ink-subtle">또는 </span>
            {a.line}
          </p>
        ))}
        <p className="mt-3 text-note leading-relaxed text-ink-muted">{e.right.why}</p>
        {e.right.detail && <p className="mt-2 text-note leading-relaxed text-ink-muted">{e.right.detail}</p>}
      </section>

      <section className="mt-6">
        <h2 className="text-body font-bold">이렇게 말하면 다르게 들려요</h2>
        <ul className="mt-3 grid grid-cols-1 gap-3">
          {e.wrongs.map((w) => (
            <li key={w.id} className="border border-line bg-card p-4 text-ink">
              <p className="flex items-start gap-2">
                <Mark verdict={w.verdict} />
                <span className="font-line text-say leading-snug">{w.line}</span>
              </p>
              <p className="mt-1.5 pl-8 text-meta text-ink-subtle">{w.tags.join(" · ")}</p>
              {w.says && (
                <p className="mt-2 pl-8 text-note text-ink-muted">
                  {e.partnerName}: “<span className="font-line text-ink">{w.says}</span>”
                </p>
              )}
              <p className="mt-2 pl-8 text-note leading-relaxed text-ink-muted">{w.why}</p>
            </li>
          ))}
        </ul>
      </section>

      {e.sources.length > 0 && <p className="mt-5 text-meta text-fg-subtle">표현 출처: {sourcesLine(e.sources)}</p>}

      <BlockLink href={`/scenes/${e.sceneNumber}`} primary className="mt-8">
        이 장면 해 보기
      </BlockLink>

      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="text-body font-bold">{e.relation}에게 쓰는 다른 표현</h2>
          <ul className="mt-2 divide-y divide-line/60 border-y border-line/60">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/learn/${o.slug}`} className="flex min-h-11 items-center justify-between gap-3 py-2 text-note text-fg-muted hover:text-fg">
                  <span>「{o.ko}」</span>
                  <span className="font-line text-fg">{o.right.line}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-8 text-meta">
        <Link href="/learn" className="text-fg-subtle underline underline-offset-4 hover:text-fg">
          표현 전체 보기
        </Link>
      </p>
    </PageShell>
  );
}
