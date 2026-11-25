import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/features/site/site-header";
import { StreakChip } from "@/features/streak/streak-chip";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/features/site/metadata";
import { Panel } from "@/features/scene/block-ui";
import { getCatalog, getReel, getScene } from "@/features/scene/api";
import { CtaBar, HeroAsk, HeroStage, type FirstPick } from "@/features/landing/home-arm";
import { shuffleChoices } from "@/features/scene/choice-order";
import { LandingCta, SceneShelf } from "@/features/landing/landing-progress";
import { SiteFooter } from "@/features/landing/site-footer";
import { FeatureRows } from "@/features/landing/feature-rows";
import { ReturningSync } from "@/features/landing/returning-sync";
import { Suspense } from "react";
import { FEATURES } from "@/features/site/lean";
import { HomeShelf } from "@/features/landing/collection-views";
import { isFeatureSlug } from "@/features/scene/collections";
import { BandLights, Snowfall } from "@/features/season/season-decor";

export const metadata: Metadata = { alternates: { canonical: "/" }, openGraph: { url: SITE_URL, title: SITE_TITLE, description: SITE_DESCRIPTION, siteName: "nuanci", locale: "ko_KR", type: "website" } };

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "nuanci",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "ko",
};

export default async function Home() {
  const [catalog, beats] = await Promise.all([getCatalog(), getReel()]);
  const shelf = catalog.map(({ id, number, title, relation, place, stage, category, partnerLine, createdAt }) => ({ id, number, title, relation, place, stage, category, partnerLine, createdAt }));
  // 장면이 공개된 특집. 시즌 장식은 이 가운데 기간 중인 특집이 있을 때만 붙는다
  const featured = [...new Set(shelf.map((s) => s.category).filter(isFeatureSlug))];
  // 첫 장면을 아래 기능 소개의 실제 화면 조각으로 쓴다
  const first = catalog[0] ? await getScene(catalog[0].id) : null;
  // 첫 방문 홈 실험(B)에서 홈에 바로 놓을 첫 장면의 질문. 보기 순서는 장면 화면과 같게 섞는다
  const base = first ? shuffleChoices(first).base : null;
  const pick: FirstPick | null =
    first && base?.stage
      ? { number: first.number, context: base.context, intent: base.intent, partnerLine: base.partnerLine, partnerMotion: base.partnerIdle.motion, stage: base.stage, choices: base.choices.map((c) => ({ id: c.id, line: c.line })) }
      : null;
  return (
    // isolate: 특집 기간의 눈(Snowfall)이 페이지 바탕 바로 위, 카드와 글자 아래 층에 깔리게 한다
    <div className="isolate flex min-h-dvh flex-col bg-page text-fg break-keep">
      <Snowfall slugs={featured} />
      {/* 주소를 읽는 쪽은 Suspense 안에 둬야 홈 전체를 미리 만든 페이지로 유지할 수 있다 */}
      <Suspense fallback={null}>
        <ReturningSync />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />
      <SiteHeader
        left={
          // 테스트 입구는 머리줄에 작게 둔다. 첫 화면에서 첫 장면 버튼과 시선을 나눠 갖지 않게 한다
          FEATURES.typetest && <Link href="/test" className="flex h-11 items-center truncate font-label text-ui text-fg-muted hover:text-fg">
            유형 테스트
          </Link>
        }
        right={FEATURES.streak && <StreakChip />}
        below={<BandLights slugs={featured} />}
      />
      {/* 머리줄과 푸터 사이 전부가 이 화면의 본문이다. 스크린 리더가 "본문으로 건너뛰기"로 바로 올 수 있게 main 하나로 감싼다 */}
      <main className="flex flex-col">
      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-6 pt-3 md:px-8 min-[960px]:pb-6 returning:max-w-[1080px] returning:pb-0 returning:pt-6 lg:returning:max-w-[1200px]">
        <h1 className="poster-home font-poster text-fg returning:text-say returning:leading-none md:returning:text-display-sm">
          <span className="poster-rise block min-[960px]:inline-block returning:inline">내 영어,</span>{" "}
          <span className="poster-rise block [animation-delay:90ms] min-[960px]:inline-block returning:inline">어떻게 들릴까?</span>
        </h1>
        {/* 제목은 얻는 것을, 이 한 줄은 방법을 말한다. 다시 온 사람의 작은 머리에서는 뺀다 */}
        <p className="mt-2 text-title font-label text-fg-muted returning:hidden md:mt-3 md:text-display-sm">외우는 영어 말고, 부딪히는 영어</p>
        <p aria-hidden className="poster-scrawl absolute right-4 top-3 font-scrawl text-[clamp(32px,6vw,60px)] leading-none text-fg [--lean:-4deg] md:right-8 min-[960px]:hidden returning:hidden">
          골라 보면 알아요
        </p>
      </div>

      {/* 다시 온 방문자는 데모와 소개 대신 진행 상황과 다음 장면만 본다. 첫 방문자에게는 아무것도 그리지 않는다 */}
      <div className="mx-auto w-full max-w-[1080px] md:px-8 lg:max-w-[1200px]">
        {FEATURES.episodes ? <SceneShelf scenes={shelf} /> : <HomeShelf scenes={shelf} />}
      </div>

      {/* 종이 면과 검은 무대 사이에 장면 제목이 필름 띠처럼 흐른다. 어떤 이야기들이 있는지 읽지 않아도 지나가며 보인다 */}
      <div aria-hidden className="overflow-hidden border-b border-fg/15 bg-ink py-2.5 returning:hidden">
        <div className="ticker flex w-max whitespace-nowrap font-label text-ui text-white/70">
          {/* 끊김 없이 돌리려고 같은 줄을 두 번 놓는다. 두 번째 줄은 글자를 data-t에 두고 CSS로만 그려서,
              HTML 본문에는 장면 제목이 한 번만 들어간다(검색엔진·AI가 페이지 글을 읽을 때 목록이 두 번 잡히지 않게) */}
          <span className="flex">
            {shelf.slice(0, 15).map((x) => (
              <span key={x.id} className="px-5">
                {x.title}
              </span>
            ))}
          </span>
          <span className="flex">
            {shelf.slice(0, 15).map((x) => (
              <span key={x.id} data-t={x.title} className="px-5 before:content-[attr(data-t)]" />
            ))}
          </span>
        </div>
      </div>

      <section className="bg-ink pb-0 pt-6 min-[960px]:pb-10 returning:hidden min-[960px]:pt-8">
        <div className="mx-auto flex max-w-[1440px] flex-col min-[960px]:grid min-[960px]:grid-cols-[max(420px,min(860px,calc((100dvh-340px)*4/3)))_minmax(320px,1fr)] min-[960px]:grid-rows-[auto_auto] min-[960px]:gap-x-12 min-[960px]:px-8">
          {beats.length > 0 && (
            <div className="order-1 px-4 min-[960px]:col-start-1 min-[960px]:row-span-2 min-[960px]:row-start-1 min-[960px]:px-0">
              <Panel>
                <div className="relative aspect-[4/3] max-h-[40dvh] w-full overflow-hidden min-[960px]:max-h-none">
                  <HeroStage beats={beats} first={pick} />
                </div>
              </Panel>
            </div>
          )}

          <div className="order-2 max-w-[440px] px-4 pt-5 min-[960px]:col-start-2 min-[960px]:row-start-1 min-[960px]:self-end min-[960px]:px-0 min-[960px]:pt-0">
            {/* 같은 문구가 위쪽(좁은 화면용)에도 있어서, 넓은 화면용 이 줄은 글자를 CSS로만 그려 HTML 본문에 두 번 들어가지 않게 한다 */}
            <p
              aria-hidden
              data-t="골라 보면 알아요"
              className="poster-scrawl mb-6 hidden origin-left font-scrawl text-display-xl leading-none text-fg [--lean:-4deg] before:content-[attr(data-t)] min-[960px]:block"
            />
            <HeroAsk first={pick}>
              <p className="text-body leading-relaxed text-fg-muted">하고 싶은 말을 영어 보기 중에 고르면 상대의 표정과 속마음이 나와요.</p>
            </HeroAsk>
          </div>

          <CtaBar className="order-4 sticky bottom-0 z-10 max-w-none border-t border-fg/20 bg-ink px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 min-[960px]:static min-[960px]:col-start-2 min-[960px]:row-start-2 min-[960px]:max-w-[440px] min-[960px]:self-start min-[960px]:border-0 min-[960px]:px-0 min-[960px]:pb-0 min-[960px]:pt-6">
            <LandingCta scenes={shelf} />
          </CtaBar>
        </div>
      </section>

      {first && <FeatureRows scene={first} />}
      </main>

      <div className="mx-auto mt-auto w-full max-w-[1440px] pt-6 md:px-8 md:pb-10 returning:max-w-[1080px] lg:returning:max-w-[1200px]">
        <SiteFooter />
      </div>
    </div>
  );
}
