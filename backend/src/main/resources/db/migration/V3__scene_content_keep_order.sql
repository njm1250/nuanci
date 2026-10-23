-- 관리자 화면에서 JSON을 고칠 때 작성한 키 순서가 그대로 보이도록 jsonb 대신 json으로 저장한다
alter table scene_version alter column content type json using content::json;
