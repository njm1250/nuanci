import type { AdminScene } from "./api";

const STATUS: Record<
  AdminScene["status"],
  { label: string; className: string }
> = {
  draft: { label: "초안", className: "adm-badge-neutral" },
  published: { label: "공개", className: "adm-badge-success" },
  hidden: { label: "숨김", className: "adm-badge-neutral" },
};

export function StatusChip({ status }: { status: AdminScene["status"] }) {
  const s = STATUS[status];
  return (
    <span className={`adm-badge ${s.className}`}>
      <span className="adm-status-dot" />
      {s.label}
    </span>
  );
}
