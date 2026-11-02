import Link from "next/link";

// 모든 화면 공통 머리줄. 검은 띠 가운데에 로고를 두고, 양쪽에는 그 화면에서 필요한 이동만 둔다
export function SiteHeader({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="bg-ink text-paper">
      <div className="mx-auto grid h-14 w-full max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:h-16 md:px-8">
        <div className="flex min-w-0 items-center justify-start">{left}</div>
        <Link href="/" className="flex h-11 items-center">
          <span className="logo">nuanci</span>
        </Link>
        <div className="flex min-w-0 items-center justify-end">{right}</div>
      </div>
    </header>
  );
}
