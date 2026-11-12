// 개발자 팩("첫 PR 머지까지")의 진행을 "n/10" 대신 실제 PR이 거치는 단계로 보여 준다.
// 9화에서 보라색 Merged가 뜨는 것이 이 캠페인의 보상이라, Merged만 색 면으로 칠한다
const STATES = ["Issue", "Issue", "Issue", "Open", "Changes requested", "Changes requested", "Changes requested", "Checks failing", "Merged", "Reviewer"];

export function prState(step: number) {
  return STATES[Math.min(Math.max(step, 1), STATES.length) - 1];
}

export function PrStatus({ step }: { step: number }) {
  const state = prState(step);
  const merged = state === "Merged";
  return (
    <span
      aria-label={`PR 상태: ${state}`}
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-label text-meta ${merged ? "bg-merged text-white" : "border border-current/40"}`}
    >
      {state}
    </span>
  );
}
