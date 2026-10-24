"use client";

import Link from "next/link";
import { markEntry } from "./track";

export function BlockButton({
  children,
  onClick,
  gold = false,
  className = "",
  faceClassName = "",
  ...aria
}: {
  children: React.ReactNode;
  onClick: () => void;
  gold?: boolean;
  className?: string;
  faceClassName?: string;
} & Pick<React.AriaAttributes, "aria-pressed" | "aria-expanded" | "aria-label">) {
  return (
    <button type="button" onClick={onClick} className={`blk-btn ${gold ? "blk-btn-gold" : ""} block ${className}`} {...aria}>
      <span className={`blk block px-3 py-2.5 ${gold ? "bg-gold" : "bg-cream"} ${faceClassName}`}>{children}</span>
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
  gold = false,
  className = "",
  entry,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  gold?: boolean;
  className?: string;
  entry?: "home" | "next";
  onClick?: () => void;
}) {
  return (
    <EntryLink href={href} entry={entry} onClick={onClick} className={`blk-btn ${gold ? "blk-btn-gold" : ""} block ${className}`}>
      <span className={`blk block px-3 py-3.5 text-center font-pixel text-[15px] text-ink ${gold ? "bg-gold" : "bg-cream"}`}>{children}</span>
    </EntryLink>
  );
}

export function Panel({ children, className = "", dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={`blk-frame ${className}`}>
      <div className={`blk h-full ${dark ? "bg-slate-block text-paper" : "bg-paper text-ink"}`}>{children}</div>
    </div>
  );
}
