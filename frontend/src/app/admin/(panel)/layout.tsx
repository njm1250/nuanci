import Link from "next/link";
import { logout } from "@/features/admin/actions";
import { MarkDevice } from "@/features/admin/mark-device";

const NAV = [
  { href: "/admin", label: "장면" },
  { href: "/admin/scenes/new", label: "새 장면" },
  { href: "/admin/order", label: "순서" },
  { href: "/admin/kit", label: "에셋" },
  { href: "/admin/metrics", label: "지표" },
  { href: "/admin/errors", label: "오류" },
  { href: "/admin/query", label: "SQL 조회" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-night-deep break-keep text-paper">
      <div className="mx-auto min-h-dvh max-w-[720px] bg-night px-4 pb-12">
        <header className="flex h-14 items-center gap-1 overflow-x-auto whitespace-nowrap font-pixel text-[15px]">
          <Link href="/" className="mr-2 text-gold">
            nuanci
          </Link>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex h-11 items-center px-2 text-paper-muted hover:text-paper">
              {n.label}
            </Link>
          ))}
          <form action={logout} className="ml-auto">
            <button className="flex h-11 items-center px-2 text-paper-subtle hover:text-paper">로그아웃</button>
          </form>
        </header>
        <main className="pt-2">{children}</main>
        <MarkDevice />
      </div>
    </div>
  );
}
