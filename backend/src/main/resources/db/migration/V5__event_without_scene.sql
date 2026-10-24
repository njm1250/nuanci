-- 홈 방문처럼 장면과 상관없는 이벤트도 같은 테이블에 남긴다
alter table scene_event alter column scene_id drop not null;
alter table scene_event alter column scene_version drop not null;
alter table scene_event alter column attempt_id drop not null;
