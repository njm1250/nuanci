-- 사용자가 쓴 영어를 가장 가까운 보기에 대 본 결과. 대지 못했으면 비어 있다
alter table missing_intent add column matched_choice_id varchar(100);
alter table missing_intent add column match_confidence varchar(10);
