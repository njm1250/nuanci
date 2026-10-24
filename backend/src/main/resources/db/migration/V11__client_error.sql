-- 사용자 화면에서 난 오류. 홍보 전후로 실제 사용자가 겪는 문제를 알기 위해 남긴다
create table client_error (
    id         bigserial    primary key,
    message    varchar(500) not null,
    stack      varchar(4000),
    url        varchar(500),
    user_agent varchar(300),
    visitor_id uuid,
    created_at timestamptz  not null default now()
);

create index client_error_created_at_idx on client_error (created_at desc);
