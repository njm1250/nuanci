-- "내 말로 해 보기"에서 AI가 내린 판정(good·meh·bad)과 들린 느낌(도장 글)
alter table missing_intent add column reaction_verdict varchar(10);
alter table missing_intent add column reaction_heard varchar(40);
