import Link from "next/link";
import { Mascot } from "@/features/mascot/mascot";
import { Arrow } from "@/features/scene/scene-parts";
import { PrStatus } from "@/features/scene/pr-status";

// 홈 오른쪽 칸(모바일은 바로 가기 아래) 맨 아래의 작은 캠페인 카드. 개발자 팩(/dev)으로 보내는 유일한 홈 입구다.
// 광고처럼 생긴 띠는 눈이 건너뛰어서, 팩의 실제 화면 조각(PR 단계 칩)과 짧은 한마디로 만든다
export function DevPackBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`blk-frame ${className}`}>
      <Link href="/dev" className="blk block bg-card-raised px-4 pb-3 pt-4 text-ink hover:bg-ink/5">
        <span className="flex items-center gap-1.5 text-ink-subtle">
          <PrStatus step={4} />
          <span aria-hidden className="text-meta">→</span>
          <PrStatus step={9} />
        </span>
        {/* 설명 대신 기분 하나: 칩이 Open에서 Merged로 가는 걸 보여 주고, 그 길을 같이 가 보자고만 말한다 */}
        <span className="mt-3 block text-body font-bold">내 첫 PR, 머지까지 가 볼까?</span>
        <span className="mt-0.5 block text-meta text-ink-subtle">개발자용 10문제</span>
        <span className="mt-3 flex items-end justify-between">
          <Mascot scale={2} />
          <span className="flex items-center gap-1 text-note font-semibold">
            풀어 보기
            <Arrow />
          </span>
        </span>
      </Link>
    </div>
  );
}
