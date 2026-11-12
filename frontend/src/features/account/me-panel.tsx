"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useInquiry } from "@/features/inquiry/inquiry-form";
import { Panel } from "@/features/scene/block-ui";
import { useCleared } from "@/features/scene/progress";
import { ReactionFace } from "@/features/scene/reaction-face";
import { toggleSound, useSoundEnabled } from "@/features/scene/sfx";
import { toggleTranslation, useTranslationOn } from "@/features/scene/translation";
import { deleteAccount, logout, useAccount } from "./account";
import { GoogleButton } from "./google-button";
import { useAvatar } from "@/features/avatar/avatar";
import { StreakSection } from "@/features/streak/streak-section";
import { useStreak } from "@/features/streak/streak";
import { StreakBadge } from "@/features/streak/streak-ui";
import { setTheme, useTheme } from "@/features/theme/theme";
import { rankAt, type RankRule } from "@/features/progression/types";
import { VoiceCard } from "@/features/progression/voice-card";
import { FEATURES } from "@/features/site/lean";

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
      <h2 className="mb-1 text-note font-semibold text-fg-muted">{title}</h2>
      <div className="divide-y divide-line/40 border-y border-line/40">{children}</div>
    </section>
  );
}

const rowClass = "flex min-h-11 w-full items-center justify-between gap-3 text-left text-ui";

function Stat({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center py-3 text-center">
      <span className="font-poster text-display-sm leading-none">{value}</span>
      <span className="mt-1 text-meta text-ink-subtle">{label}</span>
    </Link>
  );
}

// 사원증 아래 바코드 막대 너비(도트)
const BARCODE = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2];

// 내 활동 숫자를 담은 nuanci 사원증. 이름과 사진, 해 본 장면 수로 오르는 직급, 이름 옆 연속 기록 뱃지를 단다
function IdCard({ cleared, ranks }: { cleared: number; ranks: RankRule[] }) {
  const account = useAccount();
  const avatar = useAvatar();
  const streak = useStreak();
  const me = account.status === "member" ? account.me : null;
  // 고른 뱃지가 실제로 얻은 것일 때만 이름 옆에 단다
  const badge = avatar.badge && streak?.badges.includes(avatar.badge) ? avatar.badge : null;
  const { current, next } = rankAt(ranks, cleared);
  return (
    <Panel>
      <div className="flex items-center justify-between bg-ink px-4 py-2.5 font-label text-ui text-fg">
        <span>
          <span className="text-pink">nuanci</span> 사원증
        </span>
        <span aria-hidden className="h-2 w-10 bg-fg/30" />
      </div>
      <div className="flex gap-4 px-4 pt-4">
        {me?.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.picture} alt="" width={80} height={96} referrerPolicy="no-referrer" className="h-24 w-20 shrink-0 border-2 border-ink object-cover" />
        ) : (
          <span className="grid h-24 w-20 shrink-0 place-items-end justify-center border-2 border-ink bg-stage-sky pb-2">
            <ReactionFace expression="happy" size={60} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-meta text-ink-subtle">이름</p>
          <p className="mt-0.5 flex min-w-0 items-center gap-2">
            <span className="truncate text-body font-semibold">{me ? (me.name ?? "이름 없음") : "손님"}</span>
            {badge && <StreakBadge days={badge} />}
          </p>
          <p className="mt-3.5 text-meta text-ink-subtle">직급</p>
          <p className="mt-0.5 break-all font-poster text-display-sm leading-none">{current.name}</p>
          {next && <p className="mt-1 break-all text-meta text-ink-muted">장면 {next.min - cleared}개 더 하면 {next.name}</p>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x-2 divide-ink/10 border-y-2 border-ink/10">
        {/* 성취는 전체 중 몇 개가 아니라 내가 해낸 개수로 보여 준다. 다음 목표는 위 직급 줄이 맡는다 */}
        <Stat href="/scenes" label="해 본 장면" value={`${cleared}`} />
        <Stat href="/expressions" label="표현 모음" value={`${cleared * PAIRS_PER_SCENE}`} />
      </div>
      <div aria-hidden className="flex h-9 items-stretch gap-[2px] px-4 py-2">
        {BARCODE.map((w, i) => (
          <span key={i} className="bg-current" style={{ width: w * 2 }} />
        ))}
        <span className="ml-auto self-end font-label text-ui leading-none text-ink-subtle">{me?.email ? "" : "GUEST"}</span>
      </div>
    </Panel>
  );
}

// 맨 위 프로필. 비로그인이면 로그인하면 얻는 것을 구체적으로 보여주고 구글 로그인으로 보낸다. 로그인했으면 이름은 사원증에 있어서 이메일과 알림만 남긴다
function Profile() {
  const account = useAccount();
  const notice = useSyncExternalStore(noop, () => new URLSearchParams(location.search).get("login"), () => null);

  // 로그인 여부를 확인하는 동안에는 대부분인 비로그인 카드 자리를 미리 비워 두어, 확인이 끝나도 아래 칸이 밀려 내려가지 않게 한다
  if (account.status === "loading") {
    return (
      <div aria-hidden inert className="invisible">
        <GuestProfile notice={null} google={false} />
      </div>
    );
  }
  if (account.status === "member" && account.me) {
    return (
      <Panel>
        <div className="p-4">
          {notice === "1" && <p className="mb-2 text-note text-ink-muted">로그인했어요. 이 기기 기록을 계정에 합쳤어요.</p>}
          <p className="truncate text-note text-ink-muted">{account.me.email}로 로그인했어요</p>
        </div>
      </Panel>
    );
  }
  return <GuestProfile notice={notice} google={account.google} />;
}

// 비로그인 프로필. 로그인하면 얻는 것을 구체적으로 보여주고 구글 로그인으로 보낸다
function GuestProfile({ notice, google }: { notice: string | null; google: boolean }) {
  return (
    <Panel>
      <div className="p-4">
        {notice === "failed" && <p className="mb-3 text-note text-rust">로그인하지 못했어요. 다시 시도해 주세요.</p>}
        <p className="text-title font-bold leading-snug">로그인하면</p>
        <ul className="mt-2 space-y-1.5 text-note leading-snug text-ink-muted">
          <li className="flex gap-2">
            <span className="text-ink">·</span>기기를 바꿔도 기록이 이어져요
          </li>
          <li className="flex gap-2">
            <span className="text-ink">·</span>
            <span>꾸민 주인공과 모은 물건이 계정에 남아요</span>
          </li>
        </ul>
        <GoogleButton next="/me" enabled={google} />
        <p className="mt-2 text-center text-meta text-ink-subtle">지금까지 한 기록도 함께 옮겨져요</p>
      </div>
    </Panel>
  );
}

// 내 정보 화면. 프로필, 내 활동 숫자, 설정, 안내를 순서대로 모은다
export function MePanel({ ranks }: { ranks: RankRule[] }) {
  const account = useAccount();
  const cleared = useCleared();
  const sound = useSoundEnabled();
  const translate = useTranslationOn();
  const dark = useTheme() === "dark";
  const member = account.status === "member";
  const { open: openInquiry, element } = useInquiry();
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
      {/* 이 화면의 주인공은 "내 영어 말투"다. 보상을 다시 켜도 직급 사원증(IdCard)이 이 자리를 차지하지 않게, 말투 카드를 늘 맨 위에 둔다 */}
      <VoiceCard name={account.status === "member" ? (account.me?.name ?? undefined) : undefined} />

      {FEATURES.rewards && (
      <>
      {/* 장면을 깨고 받은 물건을 쓰는 곳이라 내 정보에서 가장 먼저, 크게 보이게 둔다 */}
      {/* 사원증 머리와 겹치지 않게 면은 칠하지 않고, 큰 제목과 진한 선으로 눈에 띄게 한다 */}
      <Link href="/me/room" className="blk-btn blk-strong block">
        <span className="blk flex items-center justify-between gap-3 bg-card-raised px-4 py-4 text-ink">
          <span>
            <span className="block text-title font-bold leading-tight">내 아지트</span>
            <span className="mt-1 block text-meta text-ink-subtle">받은 옷 입히기 · 방에 물건 두기</span>
          </span>
          <Arrow />
        </span>
      </Link>
      </>
      )}

      {/* 로그인을 닫아 둔 동안에도 이미 로그인한 사람은 계정을 보고 로그아웃할 수 있어야 한다 */}
      {(FEATURES.login || member) && <Profile />}

      {FEATURES.streak && <StreakSection member={member} />}

      </div>

      <div className="space-y-6">
      <Section title="설정">
        <div className={rowClass}>
          <span id="sound-label">효과음</span>
          <button type="button" role="switch" aria-checked={sound} aria-labelledby="sound-label" onClick={toggleSound} className="grid min-h-11 place-items-center">
            <span className={`flex h-6 w-11 items-center p-0.5 ${sound ? "justify-end bg-pink" : "justify-start bg-fg/20"}`}>
              <span className={`size-5 ${sound ? "bg-ink" : "bg-fg"}`} />
            </span>
          </button>
        </div>
        <div className={rowClass}>
          <span id="translation-label">대사 번역</span>
          <button type="button" role="switch" aria-checked={translate} aria-labelledby="translation-label" onClick={toggleTranslation} className="grid min-h-11 place-items-center">
            <span className={`flex h-6 w-11 items-center p-0.5 ${translate ? "justify-end bg-pink" : "justify-start bg-fg/20"}`}>
              <span className={`size-5 ${translate ? "bg-ink" : "bg-fg"}`} />
            </span>
          </button>
        </div>
        <div className={rowClass}>
          <span id="theme-label">밤 화면</span>
          <button type="button" role="switch" aria-checked={dark} aria-labelledby="theme-label" onClick={() => setTheme(dark ? "light" : "dark")} className="grid min-h-11 place-items-center">
            <span className={`flex h-6 w-11 items-center p-0.5 ${dark ? "justify-end bg-pink" : "justify-start bg-fg/20"}`}>
              <span className={`size-5 ${dark ? "bg-ink" : "bg-fg"}`} />
            </span>
          </button>
        </div>
      </Section>

      <Section title="안내">
        <Link href="/terms" className={rowClass}>
          이용약관
          <Arrow />
        </Link>
        <Link href="/privacy" className={`${rowClass} font-semibold`}>
          개인정보처리방침
          <Arrow />
        </Link>
        <button type="button" onClick={() => openInquiry()} className={rowClass}>
          문의 / 오류 제보
          <Arrow />
        </button>
      </Section>

      {member && (
        <div className="flex justify-center gap-6">
          <button type="button" onClick={() => void logout()} className="min-h-11 font-label text-ui text-fg-muted underline underline-offset-4">
            로그아웃
          </button>
          <button type="button" onClick={remove} disabled={busy} className="min-h-11 font-label text-ui text-fg-subtle underline underline-offset-4 disabled:opacity-40">
            계정 삭제
          </button>
        </div>
      )}
      <p className="text-center text-meta text-fg-subtle">© 2026 nuanci</p>
      </div>
      {element}
    </div>
  );
}
