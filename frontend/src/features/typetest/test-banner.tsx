import Link from "next/link";
import { characterDataUrl } from "./characters";
import type { TypeId } from "./types";

const FACES: TypeId[] = ["pudding", "literal", "konglish"];

// 홈에서 테스트로 들어가는 입구. 유형 캐릭터 셋을 겹쳐 보여서 결과 캐릭터를 궁금하게 만든다
export function TestBanner({ className = "" }: { className?: string }) {
  return (
    <Link href="/test" className={`blk-btn block ${className}`}>
      <span className="blk flex items-center gap-3 bg-cream px-3 py-2.5 text-ink">
        <span className="flex shrink-0 -space-x-4">
          {FACES.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={id} src={characterDataUrl(id)} width={48} height={48} alt="" className="[image-rendering:pixelated]" />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-pixel text-[15px]">영어 사고 유형 테스트</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-ink-subtle">5문제로 보는 나의 영어 사고 유형 →</span>
        </span>
      </span>
    </Link>
  );
}
