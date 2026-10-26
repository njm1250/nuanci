create table progression_settings (
    id         int primary key check (id = 1),
    version    int not null,
    rules      jsonb not null,
    updated_at timestamptz not null
);

-- 지급 당시 기준을 보존해 설정을 바꿔도 기존 기념품의 획득 장면이 달라지지 않게 한다.
alter table reward_grant add column milestone_count int;

grant select on progression_settings to nuanci_query_reader;
