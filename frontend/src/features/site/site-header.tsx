import Link from "next/link";
import { logoSvg, wordmarkSvg } from "./logo";
import { SiteMenu } from "./site-menu";

// 모든 화면 공통 머리줄. 검은 띠 가운데에 로고를 두고, 왼쪽에는 그 화면의 이동을, 오른쪽에는 전체 메뉴를 둔다
export function SiteHeader({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="bg-ink text-paper">
      <div className="mx-auto grid h-14 w-full max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:h-16 md:px-8">
        <div className="flex min-w-0 items-center justify-start">{left}</div>
        <Link href="/" aria-label="nuanci" className="flex h-11 items-center gap-2">
          {/* 파비콘·앱 아이콘과 같은 고양이 말풍선 마크와 같은 격자로 그린 글자 로고. 탭에서 본 그림과 사이트가 이어진다 */}
          <span aria-hidden className="block size-7 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: logoSvg() }} />
          <span aria-hidden className="block h-5 w-[74px] [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: wordmarkSvg() }} />
        </Link>
        <div className="flex min-w-0 items-center justify-end">
          {right}
          <SiteMenu />
        </div>
      </div>
    </header>
  );
}
