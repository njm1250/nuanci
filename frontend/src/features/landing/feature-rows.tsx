import { Mascot } from "@/features/mascot/mascot";
import { RewardIcon } from "@/features/rewards/reward-icon";
import { spoken } from "@/features/collection/pairs";
import type { Choice } from "@/features/scene/types";

// 첫 방문 홈의 무대 아래에서, 장면 하나를 하면 무엇이 생기는지 실제 화면 조각으로 하나씩 보여 준다.
// 글로 설명하지 않고 결과 카드·표현 모음·아지트의 진짜 모양을 그대로 그려서, 읽지 않고도 무엇을 하는 곳인지 알게 한다
export function FeatureRows({ partnerName, partnerLine, intent, wrong, right }: { partnerName: string; partnerLine: string; intent: string; wrong: Choice; right: Choice }) {
  const rows = [
    {
      title: "말 한마디에 반응이 갈려요",
      body: "보기 셋 중 하나를 고르면 그 말을 들은 상대가 바로 반응해요. 사고가 나면 왜 그렇게 들리는지도 알려 줘요.",
      art: (
        <div className="w-full max-w-[420px] border-2 border-ink bg-cream p-4 text-ink shadow-[4px_4px_0_var(--color-ink)]">
          <p className="text-[12px] text-ink-subtle">{partnerName}</p>
          <p className="font-line text-[18px] leading-snug">{partnerLine}</p>
          <div className="mt-3 flex items-start justify-between gap-3 border-t border-ink/10 pt-3">
            <div className="min-w-0">
              <p className="font-line text-[20px] leading-snug">{wrong.line}</p>
              <p className="mt-1 text-[14px] font-bold leading-snug">{wrong.reaction}</p>
            </div>
            <span className="-rotate-6 shrink-0 whitespace-nowrap border-2 border-ink bg-bad px-1.5 py-1 font-pixel-title text-[12px] leading-none outline-2 outline-offset-1 outline-ink">사고 발생</span>
          </div>
        </div>
      ),
    },
    {
      title: "이럴 땐 이렇게, 모아 두기",
      body: "해 본 장면의 자연스러운 말은 표현 모음에 쌓여요. 영어만 가리고 다시 떠올려 볼 수도 있어요.",
      art: (
        <div className="w-full max-w-[420px] border-2 border-ink bg-cream p-4 text-ink shadow-[4px_4px_0_var(--color-ink)]">
          <p className="text-[14px] text-ink-muted">{spoken(intent)}</p>
          <p className="mt-1 flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center bg-good font-pixel text-[15px] text-[#0b1a44]">O</span>
            <span className="font-line text-[22px] leading-snug">{right.line}</span>
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-[14px] text-ink-subtle">
            <span className="grid size-6 shrink-0 place-items-center bg-bad font-pixel text-[15px] text-[#0b1a44]">X</span>
            <s className="decoration-rust decoration-2">{wrong.line}</s>
          </p>
        </div>
      ),
    },
    {
      title: "장면을 끝내면 아지트가 채워져요",
      body: "장면을 끝낼 때마다 옷과 물건이 하나씩 생겨요. 주인공에게 입히고 방에 두면서 다음 보상까지 얼마나 남았는지 볼 수 있어요.",
      art: (
        <div className="flex w-full max-w-[420px] items-end gap-4 border-2 border-ink bg-cream p-4 text-ink shadow-[4px_4px_0_var(--color-ink)]">
          <Mascot scale={4} className="shrink-0" />
          <ul className="grid flex-1 grid-cols-3 gap-2">
            {["cap", "plant", "headphones", "lamp", "guitar", "crown"].map((id, i) => (
              <li key={id} className={`grid aspect-square place-items-center border-2 ${i < 4 ? "border-ink" : "border-dashed border-line bg-night-deep"}`}>
                <RewardIcon id={id} size={28} className={i < 4 ? "" : "opacity-30 [filter:brightness(0)]"} />
              </li>
            ))}
          </ul>
        </div>
      ),
    },
  ];
  return (
    <section className="mx-auto w-full max-w-[1080px] px-4 py-14 md:px-8 md:py-20 returning:hidden">
      <ul className="space-y-16 md:space-y-24">
        {rows.map((r, i) => (
          // 데스크톱은 그림과 글을 한 줄씩 좌우를 바꿔 가며 놓아, 같은 모양이 세 번 반복돼 보이지 않게 한다
          <li key={r.title} className="grid items-center gap-6 md:grid-cols-2 md:gap-14">
            <div className={`flex justify-center ${i % 2 ? "md:order-2" : ""}`}>{r.art}</div>
            <div>
              <h2 className="font-poster text-[26px] leading-[1.25] md:text-[34px]">{r.title}</h2>
              <p className="mt-3 max-w-[420px] text-[16px] leading-relaxed text-paper-muted">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
