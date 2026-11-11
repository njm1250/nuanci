import { quotedIntent } from "@/features/collection/pairs";
import { TRAP_LABELS, type Choice, type Verdict } from "./types";

// 선택지 번호. 평소에는 테두리만 두고, 지금 고른 줄에만 먹색을 칠해 화면에서 먹색이 한 곳에만 남게 한다
// 고르기 전 보기에서는 손을 올리면 번호 칸이 먹색으로 뒤집히며 살짝 기운다
export function Num({ n, dark = false, hover = false }: { n: number; dark?: boolean; hover?: boolean }) {
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center font-label text-ui transition-transform duration-fast ${dark ? "bg-ink text-fg" : "border-2 border-ink/20 text-ink-muted"} ${hover ? "group-hover:-rotate-6 group-hover:border-ink group-hover:bg-ink group-hover:text-white" : ""}`}
    >
      {n}
    </span>
  );
}

// 고른 말의 판정. 맞고 틀림은 색과 작은 글자로만 남기고, 도장에는 채점 대신 그 말이 어떻게 들렸는지를 새긴다
export const VERDICTS: Record<Verdict, { label: string; color: string; stamp: string }> = {
  good: { label: "자연스러워요", color: "bg-good", stamp: "참 잘했어요" },
  meh: { label: "상황에 따라 어색해요", color: "bg-warn", stamp: "애매해요" },
  bad: { label: "어색해요", color: "bg-bad", stamp: "사고 발생" },
};

// 그 말이 상대에게 어떻게 들렸는지. 보기마다 붙은 태그의 두 번째(들린 느낌)를 쓰고, 없으면 판정 도장 글자를 쓴다
export function heardAs(choice: Choice) {
  return choice.tags[1] ?? choice.tags[0] ?? VERDICTS[choice.verdict].stamp;
}

// 살짝 기운 채로 찍히는 인상 도장. 픽셀 무대에 맞게 부드럽게 커지지 않고 몇 프레임으로 끊어서 쾅 찍힌다
export function VerdictStamp({ choice, pop = false, delay = 60 }: { choice: Choice; pop?: boolean; delay?: number }) {
  const v = VERDICTS[choice.verdict];
  return (
    <span
      role="img"
      aria-label={`들린 느낌 ${heardAs(choice)} · ${choice.trap ? `${v.label} · ${TRAP_LABELS[choice.trap]}` : v.label}`}
      className={`-rotate-3 inline-block border-2 border-ink px-1.5 py-1 font-label-strong text-meta leading-none text-ink outline-2 outline-offset-1 outline-ink ${v.color} ${pop ? "animate-stamp" : ""}`}
      style={pop ? { animationDelay: `${delay}ms` } : undefined}
    >
      {heardAs(choice)}
    </span>
  );
}

// 세 말을 다 들어 본 뒤의 한 장: 같은 마음이 말마다 어떻게 들렸는지 도장 셋을 나란히 둔다
const COUNT_WORDS = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱"];

export function HeardTrio({ intent, choices }: { intent: string; choices: Choice[] }) {
  const count = COUNT_WORDS[choices.length] ?? String(choices.length);
  return (
    <div data-trio className="blk-frame blk-strong mt-3 scroll-mt-3 animate-rise">
      <div className="blk bg-card-raised px-4 py-3.5 text-ink">
        <p className="text-note text-ink-muted">같은 마음도 {count} 가지로 들려요</p>
        <p className="mt-0.5 text-body font-bold leading-snug">{quotedIntent(intent)}</p>
        <ul className="mt-3 space-y-2.5">
          {choices.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="font-line text-say leading-snug">{c.line}</span>
              <span className="inline-block animate-stamp" style={{ animationDelay: `${200 + i * 120}ms` }}>
                <VerdictStamp choice={c} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// 실제 대화에서 낼 사고의 크기. 모든 틀린 말이 큰 사고처럼 보이면 말하기가 무서워져서, 그냥 넘어가는 실수와 진짜 오해를 갈라 준다
const STAKES = {
  small: { dots: 1, text: "대부분 알아듣고 넘어가요" },
  big: { dots: 3, text: "진짜 오해가 생길 수 있어요" },
} as const;

export function StakesNote({ stakes }: { stakes: "small" | "big" }) {
  const s = STAKES[stakes];
  return (
    <span className="flex items-center gap-2 text-meta text-ink-subtle">
      <span role="img" aria-label={`사고 크기 ${stakes === "big" ? "큼" : "작음"}`} className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`size-1.5 border border-ink ${n <= s.dots ? "bg-ink" : ""}`} />
        ))}
      </span>
      {s.text}
    </span>
  );
}

// 맞고 틀림은 결과의 주인공이 아니라서 맨 아래 줄에 작은 색 칸과 글자로만 둔다
export function VerdictNote({ choice }: { choice: Choice }) {
  const v = VERDICTS[choice.verdict];
  return (
    <span className="flex items-center gap-1.5 text-meta text-ink-subtle">
      <span aria-hidden className={`size-2 border border-ink ${v.color}`} />
      {v.label}
    </span>
  );
}
