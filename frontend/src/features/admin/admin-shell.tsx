"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "./actions";

const GROUPS = [
  {
    label: "분석",
    links: [
      { href: "/admin", label: "운영 대시보드", icon: "overview" },
      { href: "/admin/metrics", label: "이용 지표", icon: "chart" },
      { href: "/admin/users", label: "유저 탐색", icon: "users" },
    ],
  },
  {
    label: "콘텐츠",
    links: [
      { href: "/admin/scenes", label: "장면 관리", icon: "scenes" },
      { href: "/admin/order", label: "노출 순서", icon: "order" },
      { href: "/admin/kit", label: "에셋 작업실", icon: "kit" },
    ],
  },
  {
    label: "운영",
    links: [
      { href: "/admin/settings", label: "운영 설정", icon: "settings" },
      { href: "/admin/inquiries", label: "문의 · 제보", icon: "inbox" },
      { href: "/admin/errors", label: "클라이언트 오류", icon: "error" },
      { href: "/admin/query", label: "SQL 콘솔", icon: "database" },
    ],
  },
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    settings: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="8" cy="18" r="2" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" />
      </>
    ),
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4" />
      </>
    ),
    scenes: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m10 8 6 4-6 4Z" />
      </>
    ),
    order: (
      <>
        <path d="M10 5h11M10 12h11M10 19h11M4 3v18m-2-2 2 2 2-2" />
      </>
    ),
    kit: (
      <>
        <path d="m12 3 9 5v9l-9 5-9-5V8Zm0 9 9-4M12 12 3 8m9 4v10" />
      </>
    ),
    inbox: (
      <>
        <path d="M4 5h16l2 13H2Zm-1 8h5l2 3h4l2-3h5" />
      </>
    ),
    error: (
      <>
        <path d="m12 3 10 18H2Zm0 6v5m0 3v1" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0" />
      </>
    ),
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = GROUPS.flatMap((g) => g.links).find((n) =>
    n.href === "/admin" ? path === n.href : path.startsWith(n.href),
  );
  return (
    <div className="admin-shell">
      <aside className="adm-sidebar">
        <Link href="/admin" className="adm-brand">
          <span className="adm-brand-mark">n.</span>
          <span>
            nuanci<small>ADMIN WORKSPACE</small>
          </span>
        </Link>
        <nav aria-label="관리자 메뉴">
          {GROUPS.map((group) => (
            <div className="adm-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.links.map((link) => {
                const active =
                  link.href === "/admin"
                    ? path === link.href
                    : path.startsWith(link.href);
                return (
                  <Link
                    href={link.href}
                    key={link.href}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon name={link.icon} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="adm-sidebar-bottom">
          <Link href="/" target="_blank" rel="noreferrer">
            서비스 열기 <span>↗</span>
          </Link>
          <form action={logout}>
            <button type="submit">로그아웃</button>
          </form>
        </div>
      </aside>
      <div className="adm-workspace">
        <header className="adm-topbar">
          <div>
            <span>워크스페이스</span>
            <span className="adm-breadcrumb-slash">/</span>
            <strong>
              {path.endsWith("/new")
                ? "새 장면"
                : (current?.label ?? "장면 편집")}
            </strong>
          </div>
          <div className="adm-topbar-right">
            <span className="adm-timezone">기준 시간 Asia/Seoul</span>
            <button
              className="adm-btn adm-btn-sm"
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => router.refresh())}
            >
              {pending ? "갱신 중…" : "↻ 새로고침"}
            </button>
            <span className="adm-avatar" title="관리자">
              N
            </span>
          </div>
        </header>
        <main className="adm-main">{children}</main>
        <footer className="adm-footer">
          nuanci 운영 워크스페이스{" "}
          <span>표의 수치는 각 화면의 집계 기준을 따릅니다.</span>
        </footer>
      </div>
    </div>
  );
}
