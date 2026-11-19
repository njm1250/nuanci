-- LLM 호출 한 번마다 한 줄. 어떤 기능이 어떤 프롬프트 버전·모델로 불렀고, 어떻게 끝났고(ok, blocked, unavailable…), 얼마나 걸렸는지
create table ai_call (
    id             bigserial    primary key,
    feature        varchar(30)  not null,
    prompt_version varchar(30)  not null,
    model          varchar(60)  not null,
    outcome        varchar(20)  not null,
    latency_ms     int          not null,
    input_tokens   int          not null default 0,
    output_tokens  int          not null default 0,
    attempts       int          not null default 1,
    visitor_id     uuid,
    scene_id       varchar(100),
    created_at     timestamptz  not null default now()
);

create index ai_call_created_idx on ai_call (created_at desc);

GRANT SELECT ON ai_call TO nuanci_query_reader;

-- "내 말로 해 보기"의 결말과 상상한 반응. match_confidence는 outcome으로 대신한다
alter table missing_intent add column outcome varchar(20);
alter table missing_intent add column reaction_expression varchar(20);
alter table missing_intent add column reaction_thought varchar(200);
