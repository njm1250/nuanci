"use client";

import Link from "next/link";

export function BlockButton({
  children,
  onClick,
  gold = false,
  className = "",
  faceClassName = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  gold?: boolean;
  className?: string;
  faceClassName?: string;
}) {
  return (
    <button onClick={onClick} className={`blk-btn ${gold ? "blk-btn-gold" : ""} block ${className}`}>
      <span className={`blk block px-3 py-2.5 ${gold ? "bg-gold" : "bg-cream"} ${faceClassName}`}>{children}</span>
    </button>
  );
}

export function BlockLink({ href, children, gold = false, className = "" }: { href: string; children: React.ReactNode; gold?: boolean; className?: string }) {
  return (
    <Link href={href} className={`blk-btn ${gold ? "blk-btn-gold" : ""} block ${className}`}>
      <span className={`blk block px-3 py-3 text-center font-pixel text-[15px] text-ink ${gold ? "bg-gold" : "bg-cream"}`}>{children}</span>
    </Link>
  );
}

export function Panel({ children, className = "", dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={`blk-frame ${className}`}>
      <div className={`blk h-full ${dark ? "bg-ink text-paper" : "bg-paper"}`}>{children}</div>
    </div>
  );
}

