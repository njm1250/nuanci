-- 화면 안에서 보내는 문의·오류 제보. 연락처는 답장을 원하는 사람만 남긴다
create table inquiry (
    id         bigserial     primary key,
    kind       varchar(10)   not null,
    message    varchar(2000) not null,
    contact    varchar(200),
    page       varchar(300),
    visitor_id uuid,
    user_id    uuid,
    user_agent varchar(300),
    done       boolean       not null default false,
    created_at timestamptz   not null default now()
);

create index inquiry_created_at_idx on inquiry (created_at desc);
