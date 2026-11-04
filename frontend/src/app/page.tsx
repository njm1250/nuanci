import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/features/site/site-header";
import { StreakChip } from "@/features/streak/streak-chip";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/features/site/metadata";
import { Panel } from "@/features/scene/block-ui";
import { getCatalog, getReel, getScene } from "@/features/scene/api";
import { AttractReel } from "@/features/landing/attract-reel";
import { LandingCta, SceneShelf } from "@/features/landing/landing-progress";
import { SiteFooter } from "@/features/landing/site-footer";
import { FeatureRows } from "@/features/landing/feature-rows";

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
  // 첫 장면에서 사고가 나는 보기 하나를 골라, 데스크톱 오른쪽에 규칙을 한 컷으로 보여 주는 예시로 쓴다
  const first = catalog[0] ? await getScene(catalog[0].id) : null;
  const wrong = first?.base.choices.find((c) => c.verdict === "bad");
  const sample = first && wrong ? { name: first.partnerName, heard: first.base.partnerLine, said: wrong.line } : null;
  const right = first?.base.choices.find((c) => c.verdict === "good");
  return (
    <div className="flex min-h-dvh flex-col bg-night text-paper break-keep">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />
      <SiteHeader
        left={
          // 테스트 입구는 머리줄에 작게 둔다. 첫 화면에서 첫 장면 버튼과 시선을 나눠 갖지 않게 한다
          <Link href="/test" className="flex h-11 items-center truncate font-pixel text-[15px] text-paper-muted hover:text-paper">
            유형 테스트
          </Link>
        }
        right={<StreakChip />}
      />
      <div>
        <div className="relative mx-auto max-w-[1440px] px-4 pb-6 pt-3 md:px-8 min-[960px]:pb-6 returning:hidden">
          <h1 className="poster-home font-poster">
            <span className="poster-rise block min-[960px]:inline-block">직역하면</span>{" "}
            <span className="poster-rise block [animation-delay:90ms] min-[960px]:inline-block">사고 나는 순간들</span>
          </h1>
          <p aria-hidden className="poster-scrawl absolute right-4 top-3 font-scrawl text-[clamp(32px,6vw,60px)] leading-none text-paper [--lean:-4deg] md:right-8 min-[960px]:hidden">
            골라 보면 알아요
          </p>
        </div>
        {/* 다시 온 방문자에게도 첫 화면의 포스터 제목을 작게 남겨서 두 화면의 인상이 이어진다 */}
        <div className="mx-auto hidden max-w-[1080px] px-4 pt-6 md:px-8 lg:max-w-[1200px] returning:block">
          <p aria-hidden className="font-poster text-[28px] leading-none text-paper md:text-[36px]">
            직역하면 사고 나는 순간들
          </p>
        </div>
      </div>

      {/* 다시 온 방문자는 데모와 소개 대신 진행 상황과 다음 장면만 본다. 첫 방문자에게는 아무것도 그리지 않는다 */}
      <div className="mx-auto w-full max-w-[1080px] md:px-8 lg:max-w-[1200px]">
        <SceneShelf scenes={shelf} />
      </div>

      {/* 종이 면과 검은 무대 사이에 장면 제목이 필름 띠처럼 흐른다. 어떤 이야기들이 있는지 읽지 않아도 지나가며 보인다 */}
      <div aria-hidden className="overflow-hidden border-b border-paper/15 bg-ink py-2.5 returning:hidden">
        <div className="ticker flex w-max whitespace-nowrap font-pixel text-[15px] text-[#ffffff]/55">
          {[0, 1].map((k) => (
            <span key={k} className="flex">
              {shelf.slice(0, 15).map((x, i) => (
                <span key={x.id} className="px-5">
                  <span className="text-[#ffffff]">EP.{String(i + 1).padStart(2, "0")}</span> {x.title}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <main className="bg-ink pb-0 pt-6 min-[960px]:pb-10 returning:hidden min-[960px]:pt-8">
        <div className="mx-auto flex max-w-[1440px] flex-col min-[960px]:grid min-[960px]:grid-cols-[max(420px,min(860px,calc((100dvh-340px)*4/3)))_minmax(320px,1fr)] min-[960px]:grid-rows-[auto_auto] min-[960px]:gap-x-12 min-[960px]:px-8">
          {beats.length > 0 && (
            <div className="order-1 px-4 min-[960px]:col-start-1 min-[960px]:row-span-2 min-[960px]:row-start-1 min-[960px]:px-0">
              <Panel>
                <div className="relative aspect-[4/3] max-h-[40dvh] w-full overflow-hidden min-[960px]:max-h-none">
                  <AttractReel beats={beats} />
                </div>
              </Panel>
            </div>
          )}

          <div className="order-2 max-w-[440px] px-4 pt-5 min-[960px]:col-start-2 min-[960px]:row-start-1 min-[960px]:self-end min-[960px]:px-0 min-[960px]:pt-0">
            {sample && (
              // 오답 한 컷을 인쇄 스티커처럼 붙여서 글을 읽기 전에 "고르면 반응이 온다"는 규칙이 보이게 한다
              <div aria-hidden className="mb-8 hidden w-fit max-w-full -rotate-2 border-2 border-[#ffffff] bg-[#ffffff] px-4 py-3 text-[#0b1a44] shadow-[4px_4px_0_var(--color-gold)] min-[960px]:block">
                <p className="text-[13px] text-[#5a6482]">{sample.name}</p>
                <p className="font-line text-[18px] leading-snug">{sample.heard}</p>
                <p className="mt-2 flex items-center gap-3">
                  <span className="font-line text-[18px] leading-snug">나: {sample.said}</span>
                  <span className="-rotate-6 shrink-0 whitespace-nowrap border-2 border-[#0b1a44] bg-bad px-1.5 py-1 font-pixel-title text-[12px] leading-none outline-2 outline-offset-1 outline-[#0b1a44]">사고 발생</span>
                </p>
              </div>
            )}
            <p aria-hidden className="poster-scrawl mb-6 hidden origin-left font-scrawl text-[60px] leading-none text-paper [--lean:-4deg] min-[960px]:block">
              골라 보면 알아요
            </p>
            <p className="text-[16px] leading-relaxed text-paper-muted">하고 싶은 말을 영어 보기 셋 중에 고르면, 그 말을 들은 상대 반응이 바로 나와요.</p>
          </div>

          <div className="order-4 sticky bottom-0 z-10 max-w-none border-t border-paper/20 bg-ink px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 min-[960px]:static min-[960px]:col-start-2 min-[960px]:row-start-2 min-[960px]:max-w-[440px] min-[960px]:self-start min-[960px]:border-0 min-[960px]:px-0 min-[960px]:pb-0 min-[960px]:pt-6">
            <LandingCta scenes={shelf} />
          </div>
        </div>
      </main>

      {first && wrong && right && <FeatureRows partnerName={first.partnerName} partnerLine={first.base.partnerLine} intent={first.base.intent} wrong={wrong} right={right} />}

      <div className="mx-auto mt-auto w-full max-w-[1440px] pt-6 md:px-8 md:pb-10 returning:max-w-[1080px] lg:returning:max-w-[1200px]">
        <SiteFooter />
      </div>
    </div>
  );
}
