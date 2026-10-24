-- 기존 이벤트는 당시 로그인 여부를 알 수 없으므로 unknown으로 보존한다
alter table scene_event add column user_id uuid references app_user(id) on delete set null;
alter table scene_event add column auth_state varchar(10) not null default 'unknown';
alter table scene_event add constraint scene_event_auth_state_check check (auth_state in ('unknown', 'guest', 'member'));
create index scene_event_user_id_idx on scene_event(user_id) where user_id is not null;
