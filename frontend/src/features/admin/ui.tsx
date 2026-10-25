import type { ReactNode } from "react";

export type AdminTone =
  "neutral" | "informative" | "positive" | "warning" | "critical";

export function AdminHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="adm-page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="adm-actions">{actions}</div>}
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`adm-panel ${className}`}>
      {title && (
        <div className="adm-panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminStat({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  note?: string;
  tone?: AdminTone;
}) {
  return (
    <div className="adm-stat" data-tone={tone}>
      <p>
        {label}
        <span className="adm-stat-indicator" aria-hidden>
          {tone === "positive"
            ? "✓"
            : tone === "warning" || tone === "critical"
              ? "!"
              : tone === "informative"
                ? "↗"
                : "·"}
        </span>
      </p>
      <strong>
        {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
      </strong>
      {note && <span>{note}</span>}
    </div>
  );
}

export function AdminEmpty({
  children = "표시할 데이터가 없습니다.",
}: {
  children?: ReactNode;
}) {
  return <div className="adm-empty">{children}</div>;
}

export function AdminLoading() {
  return (
    <div className="adm-loading" role="status">
      데이터를 불러오는 중…
    </div>
  );
}

export const percent = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 100) : 0;
export const number = (value: number) => value.toLocaleString("ko-KR");
export const adminTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
