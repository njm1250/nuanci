-- 장면을 끝낸 날(한국 시간). 하루에 한 번이라도 끝내면 그날이 이어진다. owner_id는 사용자 id이거나 로그인 전 방문자 id다
create table activity_day (
    owner_id uuid not null,
    day      date not null,
    primary key (owner_id, day)
);

-- 이름 옆에 다는 연속 기록 뱃지(며칠짜리인지). 없으면 달지 않는다
alter table app_user add column badge int;
