import { RewardIcon } from "@/features/rewards/reward-icon";

// 상대가 내 말을 듣고 떠올린 엉뚱한 그림을 머리 위 생각 말풍선으로 잠깐 보여준다.
// 효과음 글자(엥?, 헉!)가 사라질 즈음 부풀었다가 2초쯤 뒤 사라져서, 오해한 그림 → 실제 반응 순서로 읽힌다
export function ImagineBubble({ icon, caption, reduced }: { icon: string; caption: string; reduced: boolean }) {
  return (
    <div
      role="img"
      aria-label={`상대의 생각: ${caption}`}
      className="pointer-events-none absolute right-[4%] top-[6%] origin-bottom-right"
      style={reduced ? undefined : { animation: "imagine 2400ms ease-out 650ms both" }}
    >
      <div className="blk-frame-sm">
        <div className="blk flex items-center gap-2 bg-[#f6f4ee] px-2.5 py-1.5">
          <RewardIcon id={icon} size={32} />
          <span className="font-pixel text-[15px] leading-tight text-[#141317]">{caption}</span>
        </div>
      </div>
      <span aria-hidden className="absolute -bottom-2 right-5 size-2 bg-[#f6f4ee] outline outline-2 outline-[#141317]" />
      <span aria-hidden className="absolute -bottom-4 right-3 size-1 bg-[#f6f4ee] outline outline-2 outline-[#141317]" />
    </div>
  );
}
