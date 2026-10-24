-- 임의 조회는 테이블 소유자 권한 대신 SELECT만 가진 역할로 실행한다
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nuanci_query_reader') THEN
        CREATE ROLE nuanci_query_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
    END IF;
    EXECUTE format('GRANT nuanci_query_reader TO %I', current_user);
END
$$;
GRANT USAGE ON SCHEMA public TO nuanci_query_reader;
GRANT SELECT ON scene, scene_version, scene_event, internal_visitor, app_user, user_visitor, user_cleared TO nuanci_query_reader;
