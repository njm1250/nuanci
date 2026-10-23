"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveScene } from "./actions";

// 장면 JSON을 붙여 넣고 검사·저장한다. 배열이면 여러 장면을 한 번에 처리한다. 형식 오류는 저장을 막고, 선택지 구성 같은 경고는 보여주기만 한다
export function SceneEditor({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState(saveScene, null);
  return (
    <form action={action}>
      <textarea
        name="json"
        defaultValue={initial}
        spellCheck={false}
        className="blk block h-[60dvh] w-full resize-y bg-ink p-3 font-mono text-[13px] leading-relaxed text-paper outline-none"
      />
      {state?.error && <p className="mt-3 text-[14px] text-rust-light">{state.error}</p>}
      {state?.ok && <p className="mt-3 text-[14px] text-paper">{state.ok}</p>}
      {state?.warnings?.map((w) => (
        <p key={w} className="mt-1 text-[13px] text-gold">
          · {w}
        </p>
      ))}
      {state?.results && (
        <ul className="mt-3 space-y-2">
          {state.results.map((r, i) => (
            <li key={`${r.id}-${i}`} className="text-[14px]">
              {r.error ? (
                <span className="text-rust-light">
                  {r.id}: {r.error}
                </span>
              ) : (
                <>
                  <Link href={`/admin/scenes/${r.id}`} className="text-paper underline underline-offset-4">
                    {r.id}
                  </Link>
                  <span className="text-paper-muted">: {r.ok}</span>
                  {r.warnings?.map((w) => (
                    <span key={w} className="block text-[13px] text-gold">
                      · {w}
                    </span>
                  ))}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-3">
        <button name="intent" value="check" disabled={pending} className="blk-btn block">
          <span className="blk block bg-cream px-4 py-3 font-pixel text-[15px] text-ink">검사하기</span>
        </button>
        <button name="intent" value="save" disabled={pending} className="blk-btn blk-btn-gold block flex-1">
          <span className="blk block bg-gold px-4 py-3 text-center font-pixel text-[15px] text-ink">{pending ? "처리 중…" : "저장하기"}</span>
        </button>
      </div>
    </form>
  );
}
