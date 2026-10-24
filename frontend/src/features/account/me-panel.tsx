"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Panel } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { toggleSound, useSoundEnabled } from "@/features/scene/sfx";
import { earnedRewards, REWARDS } from "@/features/rewards/rewards";
import { deleteAccount, loginUrl, logout, useAccount } from "./account";

const noop = () => () => {};
const PAIRS_PER_SCENE = 2;

function Arrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="fill-current">
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}

function Row({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link href={href} className="flex min-h-12 items-center justify-between gap-3 border-t-2 border-ink/10 first:border-t-0">
      <span className="text-[15px]">{label}</span>
      <span className="flex items-center gap-2 font-pixel text-[15px] text-ink-subtle">
        {value}
        <Arrow />
      </span>
    </Link>
  );
}

// 로그인하면 무엇이 좋은지 알려 주고 구글 로그인으로 보낸다. 서버에 구글 설정이 없으면 준비 중으로 둔다
export function LoginBox({ next, google }: { next: string; google: boolean }) {
  return google ? (
    <a href={loginUrl(next)} className="blk-btn blk-btn-gold mt-4 block">
      <span className="blk block bg-gold px-3 py-3 text-center font-pixel text-[15px] text-ink">Google로 로그인</span>
    </a>
  ) : (
    <p className="mt-4 bg-ink/5 px-3 py-3 text-center font-pixel text-[15px] text-ink-subtle">로그인 준비 중이에요</p>
  );
}

function AccountCard() {
  const account = useAccount();
  const notice = useSyncExternalStore(noop, () => new URLSearchParams(location.search).get("login"), () => null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!window.confirm("계정을 지우면 계정에 저장한 기록이 모두 사라져요. 이 기기에 남은 기록은 그대로예요. 지울까요?")) return;
    setBusy(true);
    await deleteAccount();
    setBusy(false);
  };

  return (
    <Panel>
      <div className="p-4">
        {notice === "1" && account.status === "member" && <p className="mb-3 text-[13px] text-ink-muted">로그인했어요. 이 기기 기록을 계정에 합쳤어요.</p>}
        {notice === "failed" && <p className="mb-3 text-[13px] text-rust">로그인하지 못했어요. 다시 시도해 주세요.</p>}
        {account.status === "loading" ? (
          <p className="font-pixel text-[15px] text-ink-subtle">확인하는 중…</p>
        ) : account.status === "member" && account.me ? (
          <>
            <div className="flex items-center gap-3">
              {account.me.picture && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.me.picture} alt="" width={44} height={44} referrerPolicy="no-referrer" className="size-11 shrink-0 [image-rendering:pixelated]" />
              )}
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold">{account.me.name ?? "이름 없음"}</p>
                <p className="truncate text-[13px] text-ink-subtle">{account.me.email}</p>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">기록이 계정에 저장돼요. 다른 기기에서 로그인해도 이어서 할 수 있어요.</p>
            <div className="mt-2 flex gap-4">
              <button type="button" onClick={() => void logout()} className="min-h-11 font-pixel text-[15px] text-ink-muted underline underline-offset-4">
                로그아웃
              </button>
              <button type="button" onClick={remove} disabled={busy} className="min-h-11 font-pixel text-[15px] text-rust underline underline-offset-4 disabled:opacity-40">
                계정 삭제
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-pixel text-[15px]">로그인하면</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">이 기기에서 끝낸 장면, 모은 표현, 내 방이 계정에 저장돼요. 다른 기기에서도 이어서 할 수 있어요.</p>
            <LoginBox next="/me" google={account.google} />
          </>
        )}
      </div>
    </Panel>
  );
}

// 내 정보 화면. 계정, 내 기록, 내 방, 설정을 한곳에 모은다
export function MePanel({ total }: { total: number }) {
  const cleared = useCleared();
  const sound = useSoundEnabled();
  const earned = earnedRewards(cleared).length;
  return (
    <div className="space-y-5">
      <AccountCard />
      <Panel>
        <div className="px-4 py-1">
          <Row href="/scenes" label="끝낸 장면" value={`${cleared.length} / ${total}`} />
          <Row href="/expressions" label="모은 표현" value={`${cleared.length * PAIRS_PER_SCENE}개`} />
          <Row href="/me/room" label="내 픽셀 방" value={`물건 ${earned} / ${REWARDS.length}`} />
        </div>
      </Panel>
      <Panel>
        <div className="flex min-h-12 items-center justify-between px-4">
          <span className="text-[15px]">효과음</span>
          <button type="button" onClick={toggleSound} aria-pressed={sound} className={`min-h-11 px-3 font-pixel text-[15px] ${sound ? "text-ink" : "text-ink-subtle"}`}>
            {sound ? "켜짐" : "꺼짐"}
          </button>
        </div>
      </Panel>
    </div>
  );
}
