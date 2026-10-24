-- 구글로 로그인한 사용자. 비로그인 기록(끝낸 장면, 방문자 id)을 계정으로 옮겨 여러 기기에서 이어서 한다
create table app_user (
    id          uuid         primary key,
    provider    varchar(20)  not null,
    provider_id varchar(200) not null,
    email       varchar(320),
    name        varchar(200),
    picture     varchar(500),
    created_at  timestamptz  not null,
    unique (provider, provider_id)
);

create table user_session (
    token_hash varchar(64) primary key,
    user_id    uuid        not null references app_user (id) on delete cascade,
    created_at timestamptz not null,
    expires_at timestamptz not null
);

create table user_cleared (
    user_id    uuid         not null references app_user (id) on delete cascade,
    scene_id   varchar(100) not null,
    cleared_at timestamptz  not null,
    primary key (user_id, scene_id)
);

-- 로그인 전 이 기기의 방문자 id. 지표에서 같은 사람을 이어 볼 때 쓴다
create table user_visitor (
    visitor_id uuid        primary key,
    user_id    uuid        not null references app_user (id) on delete cascade,
    linked_at  timestamptz not null
);
