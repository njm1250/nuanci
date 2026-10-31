-- 기본 주인공을 여자로 바꾸면서 저장된 선택도 모두 여자로 맞춘다
update app_user set hero = 'girl' where hero = 'boy';
