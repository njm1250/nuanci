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
      <main className="flex min-h-dvh w-full max-w-[480px] flex-col bg-night md:grid md:min-h-0 md:self-start md:max-w-[1080px] md:grid-cols-[minmax(0,1fr)_400px] md:grid-rows-[auto_auto_1fr_auto] md:content-start md:gap-x-10 md:px-8 md:pb-10">
        <header className="flex h-12 shrink-0 items-center px-4 md:col-span-2 md:h-16 md:px-0">
          <p className="font-pixel text-[15px] text-gold">nuanci</p>
        </header>

        {beats.length > 0 && (
          <div className="px-4 md:row-span-2 md:px-0">
            <Panel>
              <div className="relative aspect-[4/3] max-h-[40dvh] w-full overflow-hidden md:max-h-none">
                <AttractReel beats={beats} />
              </div>
            </Panel>
          </div>
        )}

        <section className="px-4 pt-6 md:px-0 md:pt-2">
          <h1 className="font-pixel-title text-[24px] leading-[1.25]">
            직역하면
            <br />
            사고 나는 순간들
          </h1>
          <p className="mt-3 font-pixel text-[15px] leading-[1.6] text-paper-muted">황당한 상황 속 하고 싶은 그 한마디, 영어로는 어떻게 해야 딱 맞을까? 골라 보면 상대 속마음이 바로 보여요.</p>
        </section>

        <div className="flex flex-1 flex-col pt-6 md:col-span-2 md:row-start-4 md:pt-0">
          <SceneShelf scenes={shelf} />
          <SiteFooter contactEmail={process.env.CONTACT_EMAIL} />
        </div>

        <div className="sticky bottom-0 border-t-[3px] border-night-deep bg-night px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:static md:col-start-2 md:row-start-3 md:self-start md:border-0 md:px-0 md:pb-0 md:pt-8">
          <LandingCta scenes={shelf} />
        </div>
      </main>
    </div>
  );
}
