-- 아지트에서 꾸민 주인공 모습 (주인공 성별과 착용한 아이템)
alter table app_user add column hero varchar(10);
alter table app_user add column accessory varchar(40);
