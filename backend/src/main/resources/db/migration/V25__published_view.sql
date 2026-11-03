-- 화면별로 미리 만든 데이터(홈 데모, 표현 모음)도 같은 표에 해시로 보관한다
alter table published_content drop constraint published_content_kind_check;
alter table published_content add constraint published_content_kind_check check (kind in ('manifest', 'scene', 'view'));
