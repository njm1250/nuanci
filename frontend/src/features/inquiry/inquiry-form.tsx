"use client";

import { useRef, useState } from "react";
import { visitorId } from "@/features/scene/track";

type Kind = "error" | "question" | "scene" | "idea";

const KINDS: { id: Kind; label: string; placeholder: string }[] = [
  { id: "error", label: "오류", placeholder: "어디서 무엇을 눌렀더니 어떻게 됐는지 알려 주세요." },
  { id: "scene", label: "표현 제보", placeholder: "이상한 영어 설명이나, 장면으로 만들면 좋을 한국어 표현을 적어 주세요. 예: '수고하세요'는 영어로?" },
  { id: "question", label: "문의", placeholder: "궁금한 점을 적어 주세요." },
  { id: "idea", label: "기타", placeholder: "하고 싶은 말을 자유롭게 적어 주세요." },
];

type Status = "idle" | "sending" | "sent" | "failed" | "limited";

// 문의·오류 제보 창. 이메일을 따로 열지 않고 화면 안에서 바로 보낸다. 보던 화면 주소를 함께 보내서 오류를 찾기 쉽게 한다.
// 답장을 원하는 사람만 연락처를 남긴다. 푸터와 내 정보 화면이 같이 쓴다
export function useInquiry() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<Kind>("error");
  const open = (initial: Kind = "error") => {
    setKind(initial);
    dialog.current?.showModal();
  };
  return { open, element: <InquiryDialog dialog={dialog} kind={kind} setKind={setKind} /> };
}

function InquiryDialog({ dialog, kind, setKind }: { dialog: React.RefObject<HTMLDialogElement | null>; kind: Kind; setKind: (k: Kind) => void }) {
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const placeholder = KINDS.find((k) => k.id === kind)!.placeholder;

  const close = () => {
    dialog.current?.close();
    if (status === "sent") {
      setMessage("");
      setContact("");
      setStatus("idle");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 2 || status === "sending") return;
    setStatus("sending");
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, message, contact: contact || null, page: location.pathname, visitorId: visitorId() }),
    }).catch(() => null);
    setStatus(res?.ok ? "sent" : res?.status === 429 ? "limited" : "failed");
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="inquiry-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[440px] overflow-visible bg-transparent p-0 text-ink backdrop:bg-night-deep/80"
    >
      <div className="blk-frame">
        <div className="blk max-h-[calc(100dvh-3rem)] overflow-y-auto bg-card p-5">
          <h2 id="inquiry-title" className="font-pixel-title text-[24px] leading-[1.25]">
            문의 / 오류 제보
          </h2>

          {status === "sent" ? (
            <>
              <p className="mt-3 text-[16px] leading-relaxed">잘 받았어요. 알려 줘서 고마워요!</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{contact ? "남겨 주신 연락처로 답장할게요." : "보내 주신 내용은 하나씩 읽고 반영할게요."}</p>
              <button type="button" onClick={close} className="blk-btn blk-btn-primary mt-5 block w-full">
                <span className="blk block bg-cta px-3 py-3 text-center font-pixel text-[15px] text-cta-text">닫기</span>
              </button>
            </>
          ) : (
            <form onSubmit={submit} className="mt-4">
              <div role="radiogroup" aria-label="종류" className="grid grid-cols-4 gap-2">
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={kind === k.id}
                    onClick={() => setKind(k.id)}
                    className={`blk min-h-11 px-1 font-pixel text-[13px] ${kind === k.id ? "bg-ink text-paper" : "bg-cream text-ink ring-2 ring-inset ring-ink/15"}`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              <label className="mt-4 block">
                <span className="sr-only">내용</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={placeholder}
                  maxLength={2000}
                  rows={5}
                  required
                  className="blk block w-full resize-none bg-cream px-3 py-2.5 ring-2 ring-inset ring-ink/15 text-[16px] leading-relaxed text-ink placeholder:text-ink-subtle"
                />
              </label>

              <label className="mt-3 block">
                <span className="text-[13px] text-ink-muted">답장 받을 이메일 (선택)</span>
                <input
                  type="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={200}
                  autoComplete="email"
                  className="blk mt-1 block min-h-11 w-full bg-cream px-3 text-[16px] text-ink ring-2 ring-inset ring-ink/15"
                />
              </label>

              {status === "failed" && <p className="mt-3 text-[14px] text-rust">보내지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>}
              {status === "limited" && <p className="mt-3 text-[14px] text-rust">잠깐 사이에 많이 보냈어요. 10분 뒤 다시 보내 주세요.</p>}

              <div className="mt-5 flex gap-2">
                <button type="button" onClick={close} className="blk-btn block flex-1">
                  <span className="blk block bg-cream px-3 py-3 text-center font-pixel text-[15px] text-ink">닫기</span>
                </button>
                <button type="submit" disabled={message.trim().length < 2 || status === "sending"} className="blk-btn blk-btn-primary block flex-[2] disabled:opacity-50">
                  <span className="blk block bg-cta px-3 py-3 text-center font-pixel text-[15px] text-cta-text">{status === "sending" ? "보내는 중…" : "보내기"}</span>
                </button>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-subtle">보던 화면 주소가 함께 전달돼요. 남긴 연락처는 답장에만 쓰고, 답변을 마친 뒤 1년 안에 지워요.</p>
            </form>
          )}
        </div>
      </div>
    </dialog>
  );
}
