import { Mascot } from "@/features/mascot/mascot";

// 엔딩 컷은 자연스러운 말을 다시 들려준 뒤 한 박자 쉬고("……") 펀치라인을 던진다
export type EndingStep = "off" | "beat" | "punch";

// 바로 다음 장면으로 넘어가는 사람도 보도록 팡파르가 끝나자마자 이어서 재생한다
export const BEAT_AT = 1500;
export const PUNCH_AT = 2400;
// 펀치라인을 읽을 시간. 새 물건은 그 뒤에 무대에 올라온다
export const PUNCH_HOLD = 2200;
// 펀치라인 '두둥탁' 소리 길이(약 0.95초)에 숨 한 번을 더한 것. 연속 기록 소리는 이 뒤에 울린다
export const PUNCH_SOUND_MS = 1050;

// 무대 대사(빌드업·이음·펀치라인)의 한국어 자막. 무대 아래쪽에 붙인다. 무대가 넓은 데스크톱에서는 영화 자막처럼 한 단계 크게 쓴다
// narration은 대사가 아닌 상황 묘사("……" 줄). 말한 사람이 없으니 대사 자막(딥 블루)과 다른 흰 점선 상자로 나눠(무대 위라 밤 화면에서도 같은 색), 누가 말했는지 헷갈리지 않게 한다
export function Subtitle({ text, narration = false, className = "" }: { text: string; narration?: boolean; className?: string }) {
  return (
    <p className={`absolute inset-x-2 bottom-2 animate-fade text-center md:bottom-5 ${className}`}>
      <span
        className={`inline-block px-2 py-1 font-label text-ui leading-snug md:px-3 md:py-1.5 md:text-title ${narration ? "border-2 border-dashed border-ink-fixed bg-white text-ink-fixed" : "bg-ink text-fg"}`}
      >
        {text}
      </span>
    </p>
  );
}

// 무대 자막 자리에 두는 뜻 보기. 번역이 뜰 바로 그 자리에 버튼을 둬서, 누르면 무엇이 나오는지 자리로 알게 한다.
// 켜면 버튼이 번역 자막으로 바뀌고, 자막을 다시 누르면 닫힌다. 번역할 대사가 없는 자리(보기 뜻만 여는 때)는 칸의 글자만 바뀐다
export function MeaningCaption({ text, open, onToggle, className = "" }: { text?: string; open: boolean; onToggle: () => void; className?: string }) {
  const shown = open && !!text;
  return (
    <p className={`absolute inset-x-2 bottom-2 text-center md:bottom-5 ${className}`}>
      <button
        type="button"
        aria-pressed={open}
        aria-label={shown ? `뜻 숨기기: ${text}` : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="inline-flex min-h-11 items-center"
      >
        {shown ? (
          <span className="inline-flex animate-fade items-center gap-2 bg-ink px-2 py-1 text-left font-label text-ui leading-snug text-fg md:px-3 md:py-1.5 md:text-title">
            {text}
            <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" fill="currentColor" aria-hidden className="shrink-0 opacity-70">
              <path d="M0 0h1v1H0zM4 0h1v1H4zM1 1h1v1H1zM3 1h1v1H3zM2 2h1v1H2zM1 3h1v1H1zM3 3h1v1H3zM0 4h1v1H0zM4 4h1v1H4z" />
            </svg>
          </span>
        ) : (
          // 바깥 칸이 먹선과 그림자를, 안쪽 칸이 흰 면을 맡는다(BlockButton과 같은 짜임). 무대 안에서는 fg가 밝은 값이라 먹선 색을 흰 칸용 글자색으로 고정한다
          <span className={open ? "inline-block" : "blk-btn inline-block [--color-fg:var(--color-ink-fixed)]"}>
            <span className={`blk block px-2.5 py-1 font-label text-ui leading-snug ${open ? "bg-ink text-fg" : "bg-white text-ink-fixed"}`}>{open ? "뜻 숨기기" : "뜻 보기"}</span>
          </span>
        )}
      </button>
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
