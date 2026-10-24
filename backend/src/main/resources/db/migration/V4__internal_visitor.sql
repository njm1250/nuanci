-- 관리자로 로그인한 기기의 방문자 id. 지표에서 이 방문자의 이벤트는 빼고 센다
create table internal_visitor (
    visitor_id uuid primary key,
    created_at timestamptz not null default now()
);
