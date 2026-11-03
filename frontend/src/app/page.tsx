import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/features/site/site-header";
import { StreakChip } from "@/features/streak/streak-chip";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/features/site/metadata";
import { Panel } from "@/features/scene/block-ui";
import { getScene, getScenes } from "@/features/scene/api";
import type { Scene } from "@/features/scene/types";
import { AttractReel } from "@/features/landing/attract-reel";
import { LandingCta, SceneShelf } from "@/features/landing/landing-progress";
import { reelBeats } from "@/features/landing/reel";
import { SiteFooter } from "@/features/landing/site-footer";

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
  const summaries = await getScenes();
  const scenes = (await Promise.all(summaries.map((s) => getScene(s.id)))).filter((s): s is Scene => s !== null);
  const beats = reelBeats(scenes);
  const shelf = scenes.map(({ id, number, title, relation, place, base }) => ({ id, number, title, relation, place, stage: base.stage }));
  return (
    <div className="flex min-h-dvh flex-col bg-night text-paper break-keep">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />
      <SiteHeader
        left={
          // 테스트 입구는 머리줄에 작게 둔다. 첫 화면에서 '첫 장면 시작하기'와 시선을 나눠 갖지 않게 한다
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
      </div>

      {/* 다시 온 방문자는 데모와 소개 대신 진행 상황과 다음 장면만 본다. 첫 방문자에게는 아무것도 그리지 않는다 */}
      <div className="mx-auto w-full max-w-[1080px] md:px-8">
        <SceneShelf scenes={shelf} />
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
            <p aria-hidden className="poster-scrawl mb-6 hidden origin-left font-scrawl text-[60px] leading-none text-paper [--lean:-4deg] min-[960px]:block">
              골라 보면 알아요
            </p>
            <p className="text-[16px] leading-relaxed text-paper-muted">황당한 상황 속 하고 싶은 그 한마디, 영어로는 어떻게 해야 딱 맞을까? 골라 보면 상대 속마음이 바로 보여요.</p>
          </div>

          <div className="order-4 sticky bottom-0 z-10 max-w-none border-t border-paper/20 bg-ink px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 min-[960px]:static min-[960px]:col-start-2 min-[960px]:row-start-2 min-[960px]:max-w-[440px] min-[960px]:self-start min-[960px]:border-0 min-[960px]:px-0 min-[960px]:pb-0 min-[960px]:pt-6">
            <LandingCta scenes={shelf} />
          </div>
        </div>
      </main>

      <div className="mx-auto mt-auto w-full max-w-[1440px] pt-6 md:px-8 md:pb-10 returning:max-w-[1080px]">
        <SiteFooter />
      </div>
    </div>
  );
}
