import type { Metadata } from "next";
import "./prototype.css";

export const metadata: Metadata = {
  title: "nuanci · 장면 프로토타입",
};

export default function PrototypeLayout({ children }: LayoutProps<"/prototype">) {
  return <div className="motion-safe-only flex min-h-dvh flex-1 flex-col">{children}</div>;
}
