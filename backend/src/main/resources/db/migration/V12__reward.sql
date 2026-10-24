-- 보상으로 얻은 물건. owner_id는 로그인한 사용자 id이거나, 로그인 전이면 방문자 id다. 로그인하면 방문자 몫을 계정으로 옮긴다
-- source는 장면을 끝낸 순간 받은 것(play)과 예전 기기 기록으로 뒤늦게 채운 것(sync)을 나눈다
create table reward_grant (
    owner_id   uuid         not null,
    reward_id  varchar(40)  not null,
    color      varchar(10),
    reason     varchar(20)  not null,
    scene_id   varchar(100),
    source     varchar(10)  not null,
    seen       boolean      not null default false,
    granted_at timestamptz  not null,
    primary key (owner_id, reward_id)
);

-- 로그인 전 방문자가 끝낸 장면. 보상 조건을 서버에서 판단하는 데 쓰고, 로그인하면 계정 기록으로 옮긴다
create table visitor_cleared (
    visitor_id uuid         not null,
    scene_id   varchar(100) not null,
    cleared_at timestamptz  not null,
    primary key (visitor_id, scene_id)
);

-- 공유 링크에 붙는 짧은 코드. 친구가 이 링크로 장면을 끝내면 둘 다 보상을 받는다
create table share_code (
    code       varchar(12) primary key,
    owner_id   uuid        not null unique,
    created_at timestamptz not null
);
