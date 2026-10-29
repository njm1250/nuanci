"use client";

import Link from "next/link";
import { markEntry } from "./track";

export function BlockButton({
  children,
  onClick,
  primary = false,
  className = "",
  faceClassName = "",
  ...aria
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  className?: string;
  faceClassName?: string;
} & Pick<React.AriaAttributes, "aria-pressed" | "aria-expanded" | "aria-label">) {
  return (
    <button type="button" onClick={onClick} className={`blk-btn ${primary ? "blk-btn-primary" : ""} block ${className}`} {...aria}>
      <span className={`blk block px-3 py-2.5 ${primary ? "bg-cta text-cta-text" : "bg-cream"} ${faceClassName}`}>{children}</span>
    </button>
  );
}

export function EntryLink({ entry, onClick, ...props }: React.ComponentProps<typeof Link> & { entry?: "home" | "next" }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        if (entry) markEntry(entry);
        onClick?.(e);
      }}
    />
  );
}

export function BlockLink({
  href,
  children,
  primary = false,
  className = "",
  entry,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
  className?: string;
  entry?: "home" | "next";
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <EntryLink href={href} entry={entry} onClick={onClick} className={`blk-btn ${primary ? "blk-btn-primary" : ""} block ${className}`}>
      <span className={`blk block px-3 py-3.5 text-center font-pixel text-[15px] ${primary ? "bg-cta text-cta-text" : "bg-cream text-ink"}`}>{children}</span>
    </EntryLink>
  );
}

export function Panel({ children, className = "", dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={`blk-frame ${className}`}>
      <div className={`blk h-full ${dark ? "bg-slate-block text-paper" : "bg-card text-ink"}`}>{children}</div>
    </div>
  );
}

// 대화에서 누가 말했는지 붙이는 이름표. 먹색은 화면에서 가장 강한 색이라 라벨에는 쓰지 않고,
// 상대는 바탕보다 한 단계 진한 종이색, 나는 형광펜 연두를 옅게 깔아 둘을 구분한다
export function SpeakerTag({ me = false, children }: { me?: boolean; children: React.ReactNode }) {
  return (
    <span className={`shrink-0 justify-self-start px-1.5 py-1 font-pixel text-[15px] leading-none ${me ? "bg-gold/45 text-paper" : "bg-night-deep text-paper-muted"}`}>{children}</span>
  );
}
