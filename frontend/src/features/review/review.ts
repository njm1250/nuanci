import { visitorId } from "@/features/scene/track";

export type ReviewLine = { line: string; meaning: string };

// 복습 카드 한 장: 그 질문의 상황, 지난번 내가 처음 고른 말, 자연스러운 말과 이유
export type ReviewCard = {
  id: number;
  sceneNumber: number;
  title: string;
  partnerName: string;
  partnerLine: string;
  intent: string;
  mine: ReviewLine;
  right: ReviewLine;
  why: string;
};

export type ReviewToday = { cards: ReviewCard[]; due: number; mastered: number };

// 오늘 물을 복습 카드를 불러온다. 로그인 상태는 서버가 쿠키로 확인하고, 아니면 이 기기의 방문자 id로 찾는다
export async function loadReview(): Promise<ReviewToday | null> {
  try {
    const res = await fetch(`/api/review?visitorId=${visitorId()}`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as ReviewToday) : null;
  } catch {
    return null;
  }
}

export function answerReview(id: number, knew: boolean) {
  void fetch(`/api/review/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId: visitorId(), knew }),
    keepalive: true,
  }).catch(() => {});
}
