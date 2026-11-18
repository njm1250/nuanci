-- 웹 푸시 구독. 사용자가 고른 시각(서울 시간, 0~23시)에 다음 장면 상대의 첫마디를 보낸다.
-- 연달아 안 연 알림(unopened)이 쌓이면 보내기를 멈추고, 알림을 눌러 들어오면 0으로 돌린다
create table push_subscription (
    endpoint     varchar(1000) primary key,
    visitor_id   uuid          not null,
    p256dh       varchar(200)  not null,
    auth         varchar(100)  not null,
    hour         smallint      not null check (hour between 0 and 23),
    active       boolean       not null default true,
    unopened     int           not null default 0,
    last_sent_at timestamptz,
    created_at   timestamptz   not null default now()
);

create index push_subscription_hour_idx on push_subscription (hour) where active;

GRANT SELECT (visitor_id, hour, active, unopened, last_sent_at, created_at) ON push_subscription TO nuanci_query_reader;
