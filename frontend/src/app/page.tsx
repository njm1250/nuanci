import Link from "next/link";
import { Panel } from "@/features/scene/block-ui";
import { getScene, getScenes } from "@/features/scene/api";
import type { Scene } from "@/features/scene/types";
import { AttractReel } from "@/features/landing/attract-reel";
import { LandingCta, SceneShelf } from "@/features/landing/landing-progress";
import { reelBeats } from "@/features/landing/reel";
import { SiteFooter } from "@/features/landing/site-footer";

export default async function Home() {
  const summaries = await getScenes();
  const scenes = (await Promise.all(summaries.map((s) => getScene(s.id)))).filter((s): s is Scene => s !== null);
  const beats = reelBeats(scenes);
  const shelf = scenes.map(({ id, number, title, relation, place }) => ({ id, number, title, relation, place }));
  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep md:bg-night">
      <main className="flex min-h-dvh w-full max-w-[480px] flex-col bg-night md:grid md:min-h-0 md:self-start md:max-w-[1080px] md:grid-cols-[minmax(0,1fr)_400px] md:grid-rows-[auto_auto_1fr_auto_auto] md:content-start md:gap-x-10 md:px-8 md:pb-10">
        <header className="order-1 flex h-12 shrink-0 items-center px-4 md:order-none md:col-span-2 md:h-16 md:px-0">
          <p className="font-pixel text-[15px] text-gold">nuanci</p>
          <Link href="/me" aria-label="내 정보" className="-mr-2 ml-auto grid size-11 place-items-center text-paper-muted hover:text-paper">
            <svg width="20" height="20" viewBox="0 0 10 10" shapeRendering="crispEdges" fill="currentColor" aria-hidden>
              <path d="M3 1h4v1h1v3H7v1H3V5H2V2h1zM1 7h8v1h1v2H0V8h1z" />
            </svg>
          </Link>
        </header>

        {beats.length > 0 && (
          <div className="order-3 px-4 md:order-none md:row-span-2 md:px-0 returning:md:row-start-3 returning:md:row-span-1">
            <Panel>
              <div className="relative aspect-[4/3] max-h-[40dvh] w-full overflow-hidden md:max-h-none">
                <AttractReel beats={beats} />
              </div>
            </Panel>
          </div>
        )}

        <section className="order-4 px-4 pt-6 md:order-none md:px-0 md:pt-2 returning:hidden">
          <h1 className="font-pixel-title text-[24px] leading-[1.25]">
            직역하면
            <br />
            사고 나는 순간들
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-paper-muted">황당한 상황 속 하고 싶은 그 한마디, 영어로는 어떻게 해야 딱 맞을까? 골라 보면 상대 속마음이 바로 보여요.</p>
        </section>

        {/* 다시 온 방문자는 진행 상황과 다음 장면을 데모보다 먼저 보고, 소개 글은 숨긴다. 첫 방문자에게는 아무것도 그리지 않는다 */}
        <div className="order-2 md:order-none md:col-span-2 md:row-start-4 returning:md:row-start-2">
          <SceneShelf scenes={shelf} />
        </div>
        <div className="order-5 flex flex-1 flex-col pt-6 md:order-none md:col-span-2 md:row-start-5 md:pt-0">
          <SiteFooter contactEmail={process.env.CONTACT_EMAIL} />
        </div>

        <div className="order-6 sticky bottom-0 border-t-[3px] border-night-deep bg-night px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:static md:col-start-2 md:row-start-3 md:self-start md:border-0 md:px-0 md:pb-0 md:pt-8">
          <LandingCta scenes={shelf} />
        </div>
      </main>
    </div>
  );
}
