import { SCENES } from "@/content/scenes";
import { BlockLink, Panel } from "@/features/scene/block-ui";
import { PixelStage } from "@/features/stage/pixel-stage";

export default function Home() {
  const first = SCENES[0];
  return (
    <div className="flex min-h-dvh justify-center bg-night-deep text-paper break-keep">
      <main className="flex min-h-dvh w-full max-w-[480px] flex-col bg-night px-4 pb-8 pt-6">
        <p className="font-pixel text-[15px] text-gold">nuanci</p>
        <h1 className="mt-8 font-pixel-title text-[22px] leading-tight">
          하고 싶은 말을,
          <br />
          전하고 싶은 느낌으로.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-paper/65">짧은 장면에서 대사를 골라 보고, 그 말이 상대에게 어떻게 들리는지 확인해요.</p>
        <Panel className="mt-8">
          <div className="aspect-[4/3] overflow-hidden">
            <PixelStage spec={first.base.stage!} />
          </div>
        </Panel>
        <div className="mt-auto pt-8">
          <BlockLink href={`/scenes/${first.id}`} gold>
            시작하기
          </BlockLink>
          <p className="mt-3 text-center font-pixel text-[13px] text-paper/45">장면 {SCENES.length}개 · 한 장면에 1~2분</p>
        </div>
      </main>
    </div>
  );
}
