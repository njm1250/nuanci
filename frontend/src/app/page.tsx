import { BlockLink, EntryLink, Panel } from "@/features/scene/block-ui";
import { getScene, getScenes } from "@/features/scene/api";
import type { Scene } from "@/features/scene/types";
import { PixelStage } from "@/features/stage/pixel-stage";

export default async function Home() {
  const summaries = await getScenes();
  const scenes = (await Promise.all(summaries.map((s) => getScene(s.id)))).filter((s): s is Scene => s !== null);
  const first = scenes[0];
  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep">
      <main className="flex min-h-dvh w-full max-w-[480px] flex-col bg-night">
        <header className="flex h-12 shrink-0 items-center px-4">
          <p className="font-pixel text-[15px] text-gold">nuanci</p>
        </header>

        {first?.base.stage && (
          <div className="px-4">
            <Panel>
              <div className="aspect-[4/3] max-h-[40dvh] w-full overflow-hidden">
                <PixelStage
                  spec={first.base.stage}
                  state={{ partnerMotion: first.base.partnerIdle.motion, partnerKey: 0, talkKey: 0, reaction: null, partnerLine: first.base.partnerLine, meTurn: true }}
                />
              </div>
            </Panel>
          </div>
        )}

        <section className="px-4 pt-6">
          <h1 className="font-pixel-title text-[24px] leading-[1.25]">
            하고 싶은 말을,
            <br />
            전하고 싶은 느낌으로.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-paper-muted">영어 대사를 하나 고르면, 그 말이 상대에게 어떻게 들리는지 바로 보여요.</p>
        </section>

        <section className="flex-1 px-4 pb-6 pt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-pixel text-[15px]">장면</h2>
            <p className="text-[13px] text-paper-subtle">{scenes.length}개 · 한 장면에 1~2분</p>
          </div>
          <ul className="mt-3 space-y-4">
            {scenes.map((s) => (
              <li key={s.id}>
                <EntryLink href={`/scenes/${s.number}`} entry="home" className="blk-btn block">
                  <span className="blk flex items-center gap-3 bg-cream px-3 py-3 text-ink">
                    <span className="grid h-8 min-w-8 shrink-0 place-items-center bg-ink px-1 font-pixel text-[15px] text-paper">{s.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold leading-snug">{s.title}</span>
                      <span className="block truncate text-[13px] text-ink-subtle">
                        {s.relation} · {s.place}
                      </span>
                    </span>
                    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="shrink-0 fill-ink-subtle">
                      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
                    </svg>
                  </span>
                </EntryLink>
              </li>
            ))}
          </ul>
        </section>

        {first && (
          <footer className="sticky bottom-0 border-t-[3px] border-night-deep bg-night px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <BlockLink href={`/scenes/${first.number}`} entry="home" gold>
              시작하기
            </BlockLink>
          </footer>
        )}
      </main>
    </div>
  );
}
