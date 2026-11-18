// 장소 줄 앞에 붙는 도트 지도 핀. 글자 색을 따라가서 흐린 메타 줄에서도 같은 톤으로 보인다
export function MapPin({ className = "" }: { className?: string }) {
  return (
    <svg width="10" height="14" viewBox="0 0 5 7" shapeRendering="crispEdges" aria-hidden className={`shrink-0 fill-current ${className}`}>
      <path d="M1 0h3v1h1v3h-1v1h-1v2h-1v-2h-1v-1h-1v-3h1zM2 1v2h1v-2z" fillRule="evenodd" />
    </svg>
  );
}
