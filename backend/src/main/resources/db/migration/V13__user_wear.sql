-- 머리·얼굴·목에 하나씩 함께 쓰는 아이템 id 목록 (쉼표로 구분). 예전 accessory 하나는 이 목록의 첫 아이템으로 옮긴다
alter table app_user add column wear varchar(200);
update app_user set wear = accessory where accessory is not null;
