import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import "@/features/admin/admin.css";

export const metadata: Metadata = { title: "관리자 로그인 · nuanci" };

export default function LoginPage() {
  return (
    <main
      className="admin-shell"
      style={{ display: "grid", placeItems: "center", padding: 24 }}
    >
      <section
        className="adm-panel"
        style={{ width: "100%", maxWidth: 390, padding: 32 }}
      >
        <p style={{ fontSize: 22, fontWeight: 750 }}>
          nuanci
          <span
            className="adm-badge adm-badge-neutral"
            style={{ marginLeft: 10 }}
          >
            ADMIN
          </span>
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 650, marginTop: 24 }}>
          워크스페이스 로그인
        </h1>
        <p className="adm-muted" style={{ marginTop: 8 }}>
          콘텐츠와 서비스 운영을 관리합니다.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
