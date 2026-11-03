-- 장면을 저장하거나 공개 상태·순서를 바꾸면 같은 트랜잭션에서 발행 작업을 남긴다. 저장 직후 서버가 죽어도 작업이 남아 다음에 올린다
create table content_publish_job (
    id bigserial primary key,
    created_at timestamptz not null default now(),
    done_at timestamptz
);
create index content_publish_job_pending on content_publish_job (id) where done_at is null;

-- 저장소(S3)에 올린 주소. 비어 있으면 아직 안 올렸다
alter table published_content add column uploaded_at timestamptz;
