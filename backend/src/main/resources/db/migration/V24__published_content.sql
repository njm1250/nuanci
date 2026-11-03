-- 한 번 공개한 장면 목차와 본문을 내용 해시로 보관한다. 받는 쪽이 이전 목차를 들고 있어도 그 주소를 계속 읽을 수 있게 지우지 않는다
create table published_content (
    hash text primary key,
    kind text not null check (kind in ('manifest', 'scene')),
    content text not null,
    created_at timestamptz not null default now()
);
