import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "관리자 로그인 · nuanci" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center bg-night px-6 text-paper break-keep">
      <p className="font-pixel text-[15px] text-gold">nuanci</p>
      <h1 className="mt-2 font-pixel-title text-[24px]">관리자 로그인</h1>
      <LoginForm />
    </main>
  );
}
