// IndexNow 키 확인 파일. Bing 등 검색 엔진에 새·바뀐 주소를 바로 알릴 때(scripts/indexnow.sh) 이 키로 사이트 주인임을 확인한다
export function GET() {
  return new Response("ab3cd32016971d8b3292d636a61bc5f4", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
