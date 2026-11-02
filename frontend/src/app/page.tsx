import type { Metadata } from "next";
import Link from "next/link";
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
      <div>
        <header className="mx-auto flex h-12 w-full max-w-[1440px] shrink-0 items-center px-4 md:h-16 md:px-8 returning:max-w-[1080px]">
          <p className="font-pixel text-[15px] text-paper">
            <span className="hl">nuanci</span>
          </p>
          <div className="-mr-2 ml-auto flex items-center">
            {/* 테스트 입구는 머리줄에 작게 둔다. 첫 화면에서 '사고 치러 가기'와 시선을 나눠 갖지 않게 한다 */}
            <Link href="/test" className="flex h-11 items-center px-1.5 active:opacity-70">
              <span className="border-2 border-paper-subtle px-2 py-1 font-pixel text-[15px] leading-none text-paper hover:border-paper">유형 테스트</span>
            </Link>
            <StreakChip />
            {/* 아이콘만 두면 누를 수 있는지, 무엇인지 몰라서 글자를 같이 붙인다 */}
            <Link href="/me" className="flex h-11 items-center gap-1.5 px-2 text-paper-muted hover:text-paper active:opacity-70">
              <svg width="16" height="16" viewBox="0 0 10 10" shapeRendering="crispEdges" fill="currentColor" aria-hidden>
                <path d="M3 1h4v1h1v3H7v1H3V5H2V2h1zM1 7h8v1h1v2H0V8h1z" />
              </svg>
              <span className="font-pixel text-[15px]">내 정보</span>
            </Link>
          </div>
        </header>

        <div className="relative mx-auto max-w-[1440px] px-4 pb-6 pt-3 md:px-8 md:pb-10 returning:hidden">
          <h1 className="poster-home font-poster">
            <span className="poster-rise block">직역하면</span>
            <span className="poster-rise block [animation-delay:90ms]">사고 나는 순간들</span>
          </h1>
          <p aria-hidden className="poster-scrawl absolute right-4 top-3 font-scrawl text-[clamp(32px,6vw,84px)] leading-none text-paper [--lean:-4deg] md:right-8">
            골라 보면 알아요
          </p>
        </div>
      </div>

      {/* 다시 온 방문자는 데모와 소개 대신 진행 상황과 다음 장면만 본다. 첫 방문자에게는 아무것도 그리지 않는다 */}
      <div className="mx-auto w-full max-w-[1080px] md:px-8">
        <SceneShelf scenes={shelf} />
      </div>

      <main className="bg-ink pb-0 pt-6 md:pb-14 [--color-cta-text:#141317] [--color-cta:#c8f031] returning:hidden md:pt-10">
        <div className="mx-auto flex max-w-[1440px] flex-col md:grid md:grid-cols-[max(420px,min(640px,calc((100dvh-540px)*4/3)))_minmax(320px,1fr)] md:grid-rows-[auto_auto] md:gap-x-12 md:px-8">
          {beats.length > 0 && (
            <div className="order-1 px-4 md:col-start-1 md:row-span-2 md:row-start-1 md:px-0">
              <Panel>
                <div className="relative aspect-[4/3] max-h-[40dvh] w-full overflow-hidden md:max-h-none">
                  <AttractReel beats={beats} />
                </div>
              </Panel>
            </div>
          )}

          <p className="order-2 max-w-[440px] px-4 pt-5 text-[16px] leading-relaxed text-paper-muted md:col-start-2 md:row-start-1 md:self-end md:px-0 md:pt-0">황당한 상황 속 하고 싶은 그 한마디, 영어로는 어떻게 해야 딱 맞을까? 골라 보면 상대 속마음이 바로 보여요.</p>

          <div className="order-4 sticky bottom-0 z-10 max-w-none border-t-[3px] border-slate-block/30 bg-ink px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:static md:col-start-2 md:row-start-2 md:max-w-[440px] md:self-start md:border-0 md:px-0 md:pb-0 md:pt-6">
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
