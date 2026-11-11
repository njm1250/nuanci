import { Mascot } from "@/features/mascot/mascot";

// 엔딩 컷은 자연스러운 말을 다시 들려준 뒤 한 박자 쉬고("……") 펀치라인을 던진다
export type EndingStep = "off" | "beat" | "punch";

// 바로 다음 장면으로 넘어가는 사람도 보도록 팡파르가 끝나자마자 이어서 재생한다
export const BEAT_AT = 1500;
export const PUNCH_AT = 2400;
// 펀치라인을 읽을 시간. 새 물건은 그 뒤에 무대에 올라온다
export const PUNCH_HOLD = 2200;

// 무대 대사(빌드업·이음·펀치라인)의 한국어 자막. 무대 아래쪽에 붙인다
export function Subtitle({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`absolute inset-x-2 bottom-2 animate-fade text-center ${className}`}>
      <span className="inline-block bg-ink px-2 py-1 font-label text-ui leading-snug text-fg">{text}</span>
    </p>
  );
}

// Mochi가 무대 오른쪽 아래 구석에서 불쑥 올라와 한마디 던진다
export function MochiCameo({ step, line, className = "" }: { step: EndingStep; line: string; className?: string }) {
  return (
    <div className={`pointer-events-none absolute bottom-9 right-2 flex animate-rise-step flex-col items-end ${className}`}>
      <div key={step} className="blk-frame-sm relative mb-3 animate-fade">
        <div className="blk w-max max-w-[10rem] bg-white px-2.5 py-1.5 font-line text-note leading-snug text-ink break-keep">{step === "beat" ? "……" : line}</div>
        <span className="absolute -bottom-[5px] right-4 h-[5px] w-[10px] bg-white" />
        <span className="absolute -bottom-[9px] right-[19px] h-[4px] w-[4px] bg-white" />
      </div>
      <Mascot scale={3} className="mr-1" />
    </div>
  );
}
