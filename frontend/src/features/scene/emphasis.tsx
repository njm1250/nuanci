// 긴 설명 글에서 눈이 먼저 닿아야 할 곳만 굵게 한다. 장면 데이터에 따로 표시가 없어도 글의 짜임으로 고른다

// 해설: 따옴표로 든 영어 표현('I know him well')이 해설의 주어라서 그 부분만 굵게
export function BoldQuoted({ text }: { text: string }) {
  return text.split(/('[^']*[A-Za-z][^']*')/).map((part, i) =>
    i % 2 ? (
      <strong key={i} className="font-bold text-ink">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

// 상황: 앞 문장은 배경이고 마지막 문장이 지금 이 순간이다. 그 문장만 진하게 둬서 무엇에 답하는지 바로 보이게 한다.
// 한 문장뿐이면 나눌 배경이 없으니 그대로 둔다
export function NowLast({ text }: { text: string }) {
  const m = text.trim().match(/^(.*[.!?…])\s+([^.!?…]+[.!?…]?)$/);
  if (!m) return text;
  return (
    <>
      {m[1]} <strong className="font-semibold text-fg">{m[2]}</strong>
    </>
  );
}
