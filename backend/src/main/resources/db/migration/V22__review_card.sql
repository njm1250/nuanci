-- 처음 고른 답이 O가 아니었던 질문을 복습 카드로 둔다. 주인은 로그인했으면 계정 id, 아니면 기기의 방문자 id다.
-- box는 단어장 상자 단계(1~3), due_at은 다음에 물을 때, mastered_at은 다 익힌 때다
create table review_card (
    id          bigserial    primary key,
    owner_id    uuid         not null,
    scene_id    varchar(100) not null,
    step        varchar(20)  not null,
    choice_id   varchar(100) not null,
    box         int          not null default 1,
    due_at      timestamptz  not null,
    reviewed_at timestamptz,
    mastered_at timestamptz,
    created_at  timestamptz  not null default now(),
    unique (owner_id, scene_id, step)
);

create index review_card_due_idx on review_card (owner_id, due_at) where mastered_at is null;

-- 지금까지의 첫 선택 기록으로 카드를 채운다. 이미 지난 일이라 다음 방문에 바로 물을 수 있게 지금을 다음 물을 때로 둔다
insert into review_card (owner_id, scene_id, step, choice_id, due_at, created_at)
select f.owner_id, f.scene_id, f.step, f.choice_id, now(), f.created_at
from (
    select distinct on (coalesce(e.user_id, e.visitor_id), e.scene_id, e.step)
           coalesce(e.user_id, e.visitor_id) as owner_id, e.scene_id, e.scene_version, e.step, e.choice_id, e.created_at
    from scene_event e
    where e.type = 'choice_selected' and e.step is not null and e.choice_id is not null
    order by coalesce(e.user_id, e.visitor_id), e.scene_id, e.step, e.created_at
) f
join scene_version v on v.scene_id = f.scene_id and v.version = f.scene_version
cross join lateral json_array_elements(v.content -> f.step -> 'choices') c
where c ->> 'id' = f.choice_id and c ->> 'verdict' in ('meh', 'bad')
on conflict do nothing;

GRANT SELECT ON review_card TO nuanci_query_reader;
