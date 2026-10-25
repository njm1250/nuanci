import type { Trap, Verdict } from "@/features/scene/types";
import type { Answer } from "./types";

// 서버(문제 고르기)와 브라우저(테스트·결과 화면)가 같이 쓰는 테스트 데이터 모양과 답 기록 읽고 쓰기

export type Step = "base" | "followUp";

export type TestChoice = { id: string; line: string; meaning: string; verdict: Verdict; trap?: Trap; reaction: string };

export type TestQuestion = {
  sceneId: string;
  sceneNumber: number;
  sceneTitle: string;
  step: Step;
  partnerName: string;
  partnerLine: string;
  intent: string;
  choices: TestChoice[];
};

export const QUESTION_COUNT = 5;
// 순발력 테스트라 문제마다 시간이 있다. '느긋하게 풀기'를 켜면 없앤다
export const QUESTION_MS = 10_000;

// 문제 묶음이 바뀌면 예전 공유 링크의 답 기록을 잘못 읽지 않도록, 문제와 선택지 순서로 짧은 버전 값을 만든다
export function questionsVersion(questions: TestQuestion[]) {
  let h = 2166136261;
  const text = questions.map((q) => `${q.sceneId}:${q.step}:${q.choices.map((c) => c.id).join(",")}`).join("|");
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 5);
}

// 답 기록은 문제마다 고른 선택지 번호(1부터) 한 글자, 시간 초과는 0. 공유 링크에 그대로 붙인다 (예: 21302)
export function encodePicks(picks: number[]) {
  return picks.join("");
}

export function decodePicks(code: string | null | undefined, questions: TestQuestion[]): number[] | null {
  if (!code || code.length !== questions.length || !/^\d+$/.test(code)) return null;
  const picks = [...code].map(Number);
  return picks.every((p, i) => p <= questions[i].choices.length) ? picks : null;
}

export function chosen(questions: TestQuestion[], picks: number[]) {
  return picks.map((p, i) => (p > 0 ? questions[i].choices[p - 1] : null));
}

export function answersOf(questions: TestQuestion[], picks: number[]): Answer[] {
  return chosen(questions, picks).map((c) => ({ verdict: c?.verdict ?? null, trap: c?.trap, ms: 0 }));
}

// 결과 주소. 답 기록·버전·평균 반응 시간(0.1초 단위)을 붙여서 친구가 열어도 같은 결과와 도장 줄을 본다
export function resultPath(type: string, picks: number[], version: string, avgTenths?: number) {
  const q = new URLSearchParams({ p: encodePicks(picks), v: version });
  if (avgTenths !== undefined) q.set("t", String(avgTenths));
  return `/test/r/${type}?${q}`;
}
