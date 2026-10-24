-- 아지트에서 치워 둔 물건 id 목록 (쉼표로 구분). 얻은 물건은 기본으로 놓여 있고, 여기 있는 것만 빠진다
alter table app_user add column room_hidden varchar(400);
