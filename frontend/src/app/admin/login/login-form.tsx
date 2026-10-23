"use client";

import { useActionState } from "react";
import { login } from "@/features/admin/actions";

const field = "mt-1 block w-full bg-cream px-3 py-2.5 text-[16px] text-ink outline-none blk";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block font-pixel text-[15px] text-paper-muted">
        아이디
        <input name="id" autoComplete="username" required defaultValue={state?.id} className={field} />
      </label>
      <label className="block font-pixel text-[15px] text-paper-muted">
        비밀번호
        <input name="password" type="password" autoComplete="current-password" required className={field} />
      </label>
      {state?.error && <p className="text-[14px] text-rust-light">{state.error}</p>}
      <button disabled={pending} className="blk-btn blk-btn-gold block w-full">
        <span className="blk block bg-gold px-3 py-3.5 text-center font-pixel text-[15px] text-ink">{pending ? "확인 중…" : "로그인"}</span>
      </button>
    </form>
  );
}
