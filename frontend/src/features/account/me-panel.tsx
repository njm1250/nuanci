"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { contactHref, useNotice } from "@/features/landing/site-footer";
import { earnedRewards } from "@/features/rewards/rewards";
import { Panel } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { toggleSound, useSoundEnabled } from "@/features/scene/sfx";
import { deleteAccount, logout, useAccount } from "./account";
import { GoogleButton } from "./google-button";

const noop = () => () => {};
const PAIRS_PER_SCENE = 2;

function Arrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden className="fill-current">
      <path d="M1 0h1v1h1v1h1v1h-1v1h-1v1h-1z" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-pixel text-[15px] text-paper-subtle">{title}</h2>
      <Panel>
        <div className="divide-y-2 divide-ink/10 px-4">{children}</div>
      </Panel>
    </section>
  );
}

const rowClass = "flex min-h-12 w-full items-center justify-between gap-3 text-left text-[15px]";

function Stat({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center py-3 text-center">
      <span className="font-pixel-title text-[24px] leading-none">{value}</span>
      <span className="mt-1.5 text-[13px] text-ink-subtle">{label}</span>
    </Link>
  );
}

// 맨 위 프로필. 비로그인이면 로그인하면 얻는 것을 구체적으로 보여주고 구글 로그인으로 보낸다
function Profile() {
  const account = useAccount();
  const cleared = useCleared();
  const notice = useSyncExternalStore(noop, () => new URLSearchParams(location.search).get("login"), () => null);
  const waiting = earnedRewards(cleared).length;

  if (account.status === "loading") {
    return (
      <Panel>
        <p className="p-4 font-pixel text-[15px] text-ink-subtle">확인하는 중…</p>
      </Panel>
    );
  }
  if (account.status === "member" && account.me) {
    return (
      <Panel>
        <div className="p-4">
          {notice === "1" && <p className="mb-3 text-[13px] text-ink-muted">로그인했어요. 이 기기 기록을 계정에 합쳤어요.</p>}
          <div className="flex items-center gap-3">
            {account.me.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.me.picture} alt="" width={48} height={48} referrerPolicy="no-referrer" className="size-12 shrink-0" />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center bg-ink font-pixel text-[15px] text-paper">{(account.me.name ?? "?").slice(0, 1)}</span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold">{account.me.name ?? "이름 없음"}</p>
              <p className="truncate text-[13px] text-ink-subtle">{account.me.email}</p>
            </div>
          </div>
        </div>
      </Panel>
    );
  }
  return (
    <Panel>
      <div className="p-4">
        {notice === "failed" && <p className="mb-3 text-[13px] text-rust">로그인하지 못했어요. 다시 시도해 주세요.</p>}
        <p className="font-pixel-title text-[24px] leading-[1.25]">로그인하면</p>
        <ul className="mt-3 space-y-2 text-[14px] leading-snug text-ink-muted">
          <li className="flex gap-2">
            <span className="text-ink">·</span>기기를 바꿔도 기록이 이어져요
          </li>
          <li className="flex gap-2">
            <span className="text-ink">·</span>
            <span>
              얻은 아이템으로 주인공과 아지트를 꾸며요
              {waiting > 0 && <span className="ml-1 font-semibold text-ink">· {waiting}개 얻음</span>}
            </span>
          </li>
        </ul>
        <GoogleButton next="/me" enabled={account.google} />
        <p className="mt-2 text-center text-[12px] text-ink-subtle">지금까지 한 기록도 함께 옮겨져요</p>
      </div>
    </Panel>
  );
}

// 내 정보 화면. 프로필, 내 활동 숫자, 설정, 안내를 순서대로 모은다
export function MePanel({ total, contactEmail }: { total: number; contactEmail?: string }) {
  const account = useAccount();
  const cleared = useCleared();
  const sound = useSoundEnabled();
  const member = account.status === "member";
  const { open, element } = useNotice();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!window.confirm("계정을 지우면 계정에 저장한 기록과 꾸민 모습이 모두 사라져요. 이 기기에 남은 기록은 그대로예요. 지울까요?")) return;
    setBusy(true);
    await deleteAccount();
    setBusy(false);
  };

  return (
    <div className="space-y-6 md:grid md:grid-cols-[minmax(0,1fr)_400px] md:items-start md:gap-10 md:space-y-0">
      <div className="space-y-6">
      <Profile />

      <Panel>
        <div className="grid grid-cols-2 divide-x-2 divide-ink/10">
          <Stat href="/scenes" label="해 본 장면" value={`${cleared.length}/${total}`} />
          <Stat href="/expressions" label="표현 모음" value={`${cleared.length * PAIRS_PER_SCENE}`} />
        </div>
      </Panel>

      <Link href="/me/room" className="blk-btn block">
        <span className="blk flex items-center justify-between gap-3 bg-slate-block px-4 py-3 text-paper">
          <span>
            <span className="block font-pixel text-[15px]">아지트</span>
            <span className="block text-[13px] text-paper-subtle">주인공 꾸미기 · 물건 두기</span>
          </span>
          <Arrow />
        </span>
      </Link>
      </div>

      <div className="space-y-6">
      <Section title="설정">
        <div className={rowClass}>
          <span id="sound-label">효과음</span>
          <button type="button" role="switch" aria-checked={sound} aria-labelledby="sound-label" onClick={toggleSound} className="grid min-h-11 place-items-center">
            <span className={`flex h-6 w-11 items-center p-0.5 ${sound ? "justify-end bg-gold" : "justify-start bg-ink/20"}`}>
              <span className="size-5 bg-ink" />
            </span>
          </button>
        </div>
      </Section>

      <Section title="안내">
        <button type="button" onClick={() => open("terms")} className={rowClass}>
          이용약관
          <Arrow />
        </button>
        <button type="button" onClick={() => open("privacy")} className={`${rowClass} font-semibold`}>
          개인정보처리방침
          <Arrow />
        </button>
        {contactEmail ? (
          <a href={contactHref(contactEmail)} className={rowClass}>
            문의 / 오류 제보
            <Arrow />
          </a>
        ) : (
          <button type="button" onClick={() => open("contact")} className={rowClass}>
            문의 / 오류 제보
            <Arrow />
          </button>
        )}
      </Section>

      {member && (
        <div className="flex justify-center gap-6">
          <button type="button" onClick={() => void logout()} className="min-h-11 font-pixel text-[15px] text-paper-muted underline underline-offset-4">
            로그아웃
          </button>
          <button type="button" onClick={remove} disabled={busy} className="min-h-11 font-pixel text-[15px] text-paper-subtle underline underline-offset-4 disabled:opacity-40">
            계정 삭제
          </button>
        </div>
      )}
      <p className="text-center text-[12px] text-paper-subtle">© 2026 nuanci</p>
      </div>
      {element}
    </div>
  );
}
