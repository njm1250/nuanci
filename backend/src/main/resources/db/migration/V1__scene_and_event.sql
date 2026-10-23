create table scene (
    id              varchar(100) primary key,
    number          int          not null,
    title           varchar(200) not null,
    status          varchar(20)  not null,
    sort_order      int          not null,
    current_version int          not null,
    updated_at      timestamptz  not null
);

create table scene_version (
    scene_id     varchar(100) not null references scene (id),
    version      int          not null,
    content_hash varchar(64)  not null,
    content      jsonb        not null,
    created_at   timestamptz  not null,
    primary key (scene_id, version)
);

create table scene_event (
    id            bigserial    primary key,
    type          varchar(40)  not null,
    scene_id      varchar(100) not null,
    scene_version int          not null,
    attempt_id    uuid         not null,
    visitor_id    uuid         not null,
    step          varchar(20),
    choice_id     varchar(100),
    entry         varchar(20),
    created_at    timestamptz  not null
);

create index scene_event_scene_type_idx on scene_event (scene_id, type);
create index scene_event_created_at_idx on scene_event (created_at);
