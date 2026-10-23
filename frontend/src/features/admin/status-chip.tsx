import type { AdminScene } from "./api";

const STATUS: Record<AdminScene["status"], { label: string; className: string }> = {
  draft: { label: "초안", className: "bg-gold text-ink" },
  published: { label: "공개", className: "bg-ink text-paper" },
  hidden: { label: "숨김", className: "bg-slate-block text-paper" },
};

export function StatusChip({ status }: { status: AdminScene["status"] }) {
  const s = STATUS[status];
  return <span className={`shrink-0 px-1.5 py-1 font-pixel-title text-[12px] leading-none ${s.className}`}>{s.label}</span>;
}
