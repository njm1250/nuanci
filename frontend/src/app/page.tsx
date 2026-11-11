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
  const shelf = catalog.map(({ id, number, title, relation, place, stage, category }) => ({ id, number, title, relation, place, stage, category }));
  // 첫 장면을 아래 기능 소개의 실제 화면 조각으로 쓴다
  const first = catalog[0] ? await getScene(catalog[0].id) : null;
  // 첫 방문 홈 실험(B)에서 홈에 바로 놓을 첫 장면의 질문. 보기 순서는 장면 화면과 같게 섞는다
  const base = first ? shuffleChoices(first).base : null;
  const pick: FirstPick | null =
    first && base?.stage
      ? { number: first.number, context: base.context, intent: base.intent, partnerLine: base.partnerLine, partnerMotion: base.partnerIdle.motion, stage: base.stage, choices: base.choices.map((c) => ({ id: c.id, line: c.line })) }
      : null;
  return (
    <div className="flex min-h-dvh flex-col bg-page text-fg break-keep">
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
      />
      {/* 머리줄과 푸터 사이 전부가 이 화면의 본문이다. 스크린 리더가 "본문으로 건너뛰기"로 바로 올 수 있게 main 하나로 감싼다 */}
      <main className="flex flex-col">
      <div>
        <div className="relative mx-auto max-w-[1440px] px-4 pb-6 pt-3 md:px-8 min-[960px]:pb-6 returning:hidden">
          <h1 className="poster-home font-poster">
            <span className="poster-rise block min-[960px]:inline-block">직역하면</span>{" "}
            <span className="poster-rise block [animation-delay:90ms] min-[960px]:inline-block">사고 나는 순간들</span>
          </h1>
          <p aria-hidden className="poster-scrawl absolute right-4 top-3 font-scrawl text-[clamp(32px,6vw,60px)] leading-none text-fg [--lean:-4deg] md:right-8 min-[960px]:hidden">
            골라 보면 알아요
          </p>
        </div>
        {/* 다시 온 방문자에게도 첫 화면의 포스터 제목을 작게 남겨서 두 화면의 인상이 이어진다 */}
        <div className="mx-auto hidden max-w-[1080px] px-4 pt-6 md:px-8 lg:max-w-[1200px] returning:block">
          {/* 첫 방문 제목이 숨는 재방문 화면의 h1. 둘 중 보이는 하나만 읽힌다 */}
          <h1 className="font-poster text-display-sm leading-none text-fg md:text-display">
            직역하면 사고 나는 순간들
          </h1>
        </div>
      </div>

      {/* 다시 온 방문자는 데모와 소개 대신 진행 상황과 다음 장면만 본다. 첫 방문자에게는 아무것도 그리지 않는다 */}
      <div className="mx-auto w-full max-w-[1080px] md:px-8 lg:max-w-[1200px]">
        <SceneShelf scenes={shelf} />
      </div>

      {/* 종이 면과 검은 무대 사이에 장면 제목이 필름 띠처럼 흐른다. 어떤 이야기들이 있는지 읽지 않아도 지나가며 보인다 */}
      <div aria-hidden className="overflow-hidden border-b border-fg/15 bg-ink py-2.5 returning:hidden">
        <div className="ticker flex w-max whitespace-nowrap font-label text-ui text-white/70">
          {[0, 1].map((k) => (
            <span key={k} className="flex">
              {shelf.slice(0, 15).map((x, i) => (
                <span key={x.id} className="px-5">
                  <span className="text-white">EP.{String(i + 1).padStart(2, "0")}</span> {x.title}
                </span>
              ))}
            </span>
          ))}
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
            <p aria-hidden className="poster-scrawl mb-6 hidden origin-left font-scrawl text-display-xl leading-none text-fg [--lean:-4deg] min-[960px]:block">
              골라 보면 알아요
            </p>
            <HeroAsk first={pick}>
              <p className="text-body leading-relaxed text-fg-muted">하고 싶은 말을 영어 보기 셋 중에 고르면, 그 말을 들은 상대 반응이 바로 나와요.</p>
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
