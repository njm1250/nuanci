import { logoSvg, wordmarkSvg } from "./logo";
import { LogoLink } from "./logo-link";
import { ScrollHeader } from "./scroll-header";
import { SiteMenu } from "./site-menu";

// 모든 화면 공통 머리줄. 검은 띠 가운데에 로고를 두고, 왼쪽에는 그 화면의 이동을, 오른쪽에는 전체 메뉴를 둔다
// below는 띠 아래 가장자리에 겹쳐 그리는 장식 자리(특집 기간의 시즌 장식)
export function SiteHeader({ left, right, below }: { left?: React.ReactNode; right?: React.ReactNode; below?: React.ReactNode }) {
  return (
    <ScrollHeader>
      <div className="mx-auto grid h-14 w-full max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:h-16 md:px-8">
        <div className="flex min-w-0 items-center justify-start">{left}</div>
        <LogoLink className="group flex h-11 items-center gap-2">
          {/* 파비콘·앱 아이콘과 같은 고양이 말풍선 마크와 글자 로고. 도트 한 칸이 화면 1px이라 번지지 않는다. 가운데 맞춤이면 글자 밑줄이 마크 몸통 밑에 온다 */}
          <span aria-hidden className="block h-7 w-[26px] group-hover:animate-wiggle [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: logoSvg() }} />
          <span aria-hidden className="block h-[22px] w-[89px] [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: wordmarkSvg() }} />
        </LogoLink>
        <div className="flex min-w-0 items-center justify-end">
          {right}
          <SiteMenu />
        </div>
      </div>
      {below}
    </ScrollHeader>
  );
}
