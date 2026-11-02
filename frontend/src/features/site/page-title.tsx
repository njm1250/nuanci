// 화면의 큰 제목. note는 제목 오른쪽에 살짝 기울여 얹는 한마디로, 있어도 되는 화면에만 준다
export function PageTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="relative">
      <h1 className="poster-rise poster-h1 font-poster">{children}</h1>
      {note && (
        <p aria-hidden className="poster-scrawl absolute bottom-[0.2em] right-0 font-scrawl text-[clamp(26px,3.6vw,48px)] leading-none text-paper">
          {note}
        </p>
      )}
    </div>
  );
}
