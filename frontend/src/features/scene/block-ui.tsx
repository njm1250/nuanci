"use client";

import Link from "next/link";
import { markEntry } from "./track";

// 핑크 주 버튼(bg-cta)은 이 파일의 BlockButton·BlockLink로만 만든다(린트 nuanci/cta-in-block-ui)
export function BlockButton({
  children,
  onClick,
  primary = false,
  className = "",
  faceClassName = "",
  reading = false,
  label = false,
  type = "button",
  disabled,
  ...aria
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  className?: string;
  faceClassName?: string;
  // 둘을 나란히 두는 짧은 답 버튼처럼 포스터 글꼴이 과할 때 본문 글꼴로 쓴다
  reading?: boolean;
  // 대화 상자 안 '닫기'·'보내기'처럼 짧은 라벨 버튼. 라벨 글꼴 15px로 가운데 맞춤
  label?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
} & Pick<React.AriaAttributes, "aria-pressed" | "aria-expanded" | "aria-label">) {
  const font = label ? "text-center font-label text-ui" : primary && !reading ? "font-poster text-say" : "";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`blk-btn ${primary ? "blk-btn-primary" : ""} block ${className}`} {...aria}>
      <span className={`blk block px-3 ${label ? "py-3" : "py-2.5"} ${primary ? "bg-cta text-cta-text" : "bg-card-raised text-ink"} ${font} ${faceClassName}`}>{children}</span>
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
  reading = false,
  pair = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
  className?: string;
  // 문장처럼 읽어야 하는 긴 라벨이면 포스터 글꼴 대신 본문 글꼴을 쓴다
  reading?: boolean;
  // 주 버튼 바로 아래 짝으로 놓는 보조 버튼. 같은 포스터 글꼴을 한 단계 작게 써서 둘이 한 묶음으로 보이게 한다
  pair?: boolean;
  entry?: "home" | "next";
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <EntryLink href={href} entry={entry} onClick={onClick} className={`blk-btn ${primary ? "blk-btn-primary" : ""} block ${className}`}>
      <span className={`blk block px-3 py-3.5 text-center ${primary ? `bg-cta text-cta-text ${reading ? "text-body font-bold" : "font-poster text-say"}` : `bg-card-raised text-ink ${pair ? "font-poster text-title" : "font-label text-ui"}`}`}>{children}</span>
    </EntryLink>
  );
}

export function Panel({ children, className = "", dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={`blk-frame ${className}`}>
      <div className={`blk h-full ${dark ? "bg-surface-strong text-fg" : "bg-card text-ink"}`}>{children}</div>
    </div>
  );
}

// 대화에서 누가 말했는지 붙이는 이름표. 딥 블루와 핑크는 화면에서 가장 강한 색이라 라벨에는 쓰지 않는다
export function SpeakerTag({ me = false, children }: { me?: boolean; children: React.ReactNode }) {
  return (
    <span className={`shrink-0 justify-self-start px-1.5 py-1 font-label text-ui leading-none ${me ? "bg-surface text-fg" : "bg-surface text-fg-muted"}`}>{children}</span>
  );
}
