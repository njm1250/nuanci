-- 이미 일반 브라우저로 남은 방문 중, 새 봇 규칙(ClientKind)에 걸리는 것을 봇으로 바꾼다.
-- 1) 부 버전이 지워지지 않은 Chrome 문자열(WebView·인앱·Electron 제외) 2) 인스타·스레드 링크인데 페이스북을 거쳐 온 메타 링크 검사
update visitor_client c set client = 'bot'
where c.client <> 'bot'
  and (
    (c.user_agent ~ 'Chrome/[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+'
      and c.user_agent !~ 'Chrome/[0-9]+[.]0[.]0[.]0'
      and c.user_agent !~* '; wv[)]|electron|kakaotalk|instagram|fban|fbav|line/|naver[(]inapp|everytime|daumapps|barcelona|threads')
    or exists (
      select 1 from visitor_source s
      where s.visitor_id = c.visitor_id
        and s.source in ('instagram', 'threads')
        and s.referrer like '%facebook.com%'
        and coalesce(c.user_agent, '') !~* 'instagram|barcelona'
    )
  );
