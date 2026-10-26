-- 방문자가 쓰는 기기 종류(browser, inapp, bot, unknown). 검색·미리보기 봇과 자동화 브라우저는 이용 지표에서 뺀다
create table visitor_client (
    visitor_id uuid         primary key,
    client     varchar(10)  not null,
    user_agent varchar(300),
    created_at timestamptz  not null default now()
);

GRANT SELECT ON visitor_client TO nuanci_query_reader;
