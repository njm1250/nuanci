"use client";

import { useActionState } from "react";
import { login } from "@/features/admin/actions";

const field = "adm-input mt-2 block w-full";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-[12px] text-ink-muted">
        아이디
        <input
          name="id"
          autoComplete="username"
          required
          defaultValue={state?.id}
          className={field}
        />
      </label>
      <label className="block text-[12px] text-ink-muted">
        비밀번호
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={field}
        />
      </label>
      {state?.error && (
        <p role="alert" className="adm-notice adm-notice-danger">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="adm-btn adm-btn-primary"
        style={{ width: "100%", minHeight: 40 }}
      >
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
