-- 보기 셋 중에 하려던 말이 없을 때 사용자가 한국어로 적은 말. 같은 의도가 여러 사람에게서 나오면 그 장면의 보기를 고친다
create table missing_intent (
    id            bigserial    primary key,
    visitor_id    uuid         not null,
    scene_id      varchar(100) not null,
    scene_version int          not null,
    step          varchar(10)  not null,
    text          varchar(200) not null,
    created_at    timestamptz  not null default now()
);

create index missing_intent_scene_idx on missing_intent (scene_id, created_at desc);

GRANT SELECT ON missing_intent TO nuanci_query_reader;
