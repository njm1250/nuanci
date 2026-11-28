-- 어드민 보드에 고정한 차트. 조회 SQL과 차트 설정(종류, 가로축·값·나눌 기준 열 이름, 너비)을 함께 둔다(ADR 0045).
-- 조회 전용 역할에는 이 테이블을 읽을 권한을 주지 않는다. SQL에 쓴 {{since}}는 실행할 때 보드에서 고른 기간의 시작일로 바뀐다
create table admin_chart (
    id          bigserial    primary key,
    title       varchar(200) not null,
    description varchar(500),
    sql         text         not null,
    kind        varchar(10)  not null check (kind in ('number', 'bar', 'hbar', 'line', 'table')),
    x_col       varchar(100),
    y_col       varchar(100),
    split_col   varchar(100),
    width       smallint     not null default 2 check (width between 1 and 4),
    sort_order  int          not null,
    created_at  timestamptz  not null default now(),
    updated_at  timestamptz  not null default now()
);

-- 지금까지 자주 뽑은 지표로 보드를 채워 둔다. 기준(누구를 세나)은 metrics 뷰에 있다
insert into admin_chart (title, description, sql, kind, x_col, y_col, split_col, width, sort_order) values
('방문자', '그날 한 번이라도 들어온 사람(하루 단위)',
 $q$select count(*) as "방문자" from metrics.visitor_day where day >= {{since}}$q$, 'number', null, '방문자', null, 1, 10),
('질문 1에 답한 사람', '보기를 하나라도 고른 방문',
 $q$select count(*) filter (where picked) as "질문 1에 답한 사람" from metrics.visitor_day where day >= {{since}}$q$, 'number', null, '질문 1에 답한 사람', null, 1, 20),
('장면을 끝낸 사람', '질문 2까지 답한 방문',
 $q$select count(*) filter (where completed) as "장면을 끝낸 사람" from metrics.visitor_day where day >= {{since}}$q$, 'number', null, '장면을 끝낸 사람', null, 1, 30),
('다른 날 다시 온 사람', '기간 안에 온 사람 중 그 전후로 다른 날에도 온 사람',
 $q$select count(*) as "다른 날 다시 온 사람" from (select visitor_id from metrics.visitor_day where touched group by 1 having count(*) >= 2 and max(day) >= {{since}}) t$q$, 'number', null, '다른 날 다시 온 사람', null, 1, 40),
('날짜별 방문자 (어디서 왔나)', '사람 수 · 한국 날짜 · 경로마다 색이 정해져 있다',
 $q$with d as (select generate_series({{since}}, (now() at time zone 'Asia/Seoul')::date, interval '1 day')::date as day)
select to_char(d.day, 'YYYY-MM-DD') as "날짜", coalesce(v.channel, '기록 없음') as "경로", count(v.visitor_id) as "방문자"
from d left join metrics.visitor_day v on v.day = d.day
group by 1, 2 order by 1, 2$q$, 'bar', '날짜', '방문자', '경로', 4, 50),
('날짜별 방문 → 질문 1 답 → 장면 끝냄', '사람 수',
 $q$with d as (select generate_series({{since}}, (now() at time zone 'Asia/Seoul')::date, interval '1 day')::date as day)
select to_char(d.day, 'YYYY-MM-DD') as "날짜", count(v.visitor_id) as "방문", count(*) filter (where v.picked) as "질문 1 답", count(*) filter (where v.completed) as "장면 끝냄"
from d left join metrics.visitor_day v on v.day = d.day
group by 1 order by 1$q$, 'line', '날짜', '*', null, 2, 60),
('경로별로 어디까지 갔나', '사람 수',
 $q$select channel as "경로", count(*) as "방문", count(*) filter (where touched) as "화면을 건드림", count(*) filter (where picked) as "질문 1 답",
  count(*) filter (where picked_q2) as "질문 2 답", count(*) filter (where scenes_picked >= 2) as "2장면 이상"
from metrics.visitor_day where day >= {{since}} group by 1 order by 2 desc$q$, 'table', null, null, null, 2, 70),
('몇 번째 문항까지 답했나', '사람 수 · 1·2는 첫 장면, 3·4는 둘째 장면',
 $q$select question_no as "문항", count(*) as "사람" from metrics.question_step where day >= {{since}} and question_no <= 12 group by 1 order by 1$q$, 'bar', '문항', '사람', null, 2, 80),
('문항을 이어 간 비율', '같은 장면 안과 장면이 바뀌는 자리를 따로 본다',
 $q$with s as (select question_no, count(*) n from metrics.question_step where day >= {{since}} group by 1)
select a.question_no || ' → ' || b.question_no as "자리", case when a.question_no % 2 = 1 then '같은 장면 안' else '장면이 바뀜' end as "종류",
  a.n as "앞 문항", b.n as "다음 문항", round(100.0 * b.n / a.n) as "이어 간 %"
from s a join s b on b.question_no = a.question_no + 1 where a.question_no <= 8 order by a.question_no$q$, 'table', null, null, null, 2, 90),
('가장 많이 푼 장면, 질문 1의 첫 답', '사람 수 · 기간 안에 첫 답이 가장 많은 장면 · 색은 판정',
 $q$with top as (select scene_id from metrics.first_pick where day >= {{since}} and step = 'base' group by 1 order by count(*) desc limit 1)
select p.choice_line as "보기", p.verdict_label as "판정", count(*) as "사람"
from metrics.first_pick p join top using (scene_id) where p.day >= {{since}} and p.step = 'base'
group by 1, 2 order by 3 desc$q$, 'hbar', '보기', '사람', '판정', 2, 100),
('첫 답의 판정별로 그 뒤에 한 일', '그날 처음 답한 문항 기준 · 사람 수',
 $q$select q.verdict_label as "첫 답 판정", count(*) as "사람", count(*) filter (where d.alt_views > 0) as "다른 보기 눌러 봄",
  count(*) filter (where d.picked_q2) as "질문 2까지", count(*) filter (where d.scenes_picked >= 2) as "다른 장면까지"
from metrics.question_step q join metrics.visitor_day d using (visitor_id, day)
where q.question_no = 1 and q.day >= {{since}} group by 1 order by 2 desc$q$, 'table', null, null, null, 2, 110),
('장면별 진행', '사람 수 · 열어 본 사람이 많은 순',
 $q$select max(scene_title) as "장면", count(distinct visitor_id) filter (where type = 'scene_viewed') as "열어 봄",
  count(distinct visitor_id) filter (where type = 'choice_selected' and step = 'base') as "질문 1 답",
  count(distinct visitor_id) filter (where type = 'choice_selected' and step = 'followUp') as "질문 2 답",
  count(distinct visitor_id) filter (where type = 'scene_completed') as "끝냄",
  count(distinct visitor_id) filter (where type = 'next_clicked') as "다음 장면 누름"
from metrics.event where day >= {{since}} and scene_id is not null group by scene_id order by 2 desc limit 20$q$, 'table', null, null, null, 4, 120),
('질문별 첫 답 오답률', '첫 답이 5개 이상인 질문 · 통하지 않은 말(애매함, 다르게 들림)을 고른 비율',
 $q$select max(scene_title) as "장면", case step when 'base' then '질문 1' else '질문 2' end as "질문", count(*) as "첫 답",
  count(*) filter (where verdict_label in ('애매함', '다르게 들림')) as "틀림",
  round(100.0 * count(*) filter (where verdict_label in ('애매함', '다르게 들림')) / count(*)) as "오답률 %"
from metrics.first_pick where day >= {{since}} group by scene_id, step having count(*) >= 5 order by 5 desc$q$, 'table', null, null, null, 2, 130),
('다른 보기로 눌러 본 말', '눌러 본 사람이 많은 순',
 $q$select scene_title as "장면", choice_line as "보기", verdict_label as "판정", count(distinct visitor_id) as "눌러 본 사람"
from metrics.alt_view where day >= {{since}} group by 1, 2, 3 order by 4 desc limit 15$q$, 'table', null, null, null, 2, 140),
('떠나기까지 머문 시간', '사람 수 · 처음 화면을 떠날 때까지 · 2026-11-28 배포분부터 기록',
 $q$select case when left_after_sec <= 3 then '3초 이하' when left_after_sec <= 10 then '4~10초' when left_after_sec <= 30 then '11~30초'
  when left_after_sec <= 60 then '31~60초' when left_after_sec <= 180 then '1~3분' else '3분 넘게' end as "머문 시간",
  case when picked then '보기를 고름' else '안 고름' end as "고름", count(*) as "사람"
from metrics.visitor_day where day >= {{since}} and left_after_sec is not null
group by 1, 2 order by min(left_after_sec), 2$q$, 'bar', '머문 시간', '사람', '고름', 2, 150),
('기기별로 어디까지 갔나', '사람 수',
 $q$select os as "기기", count(*) as "방문", count(*) filter (where picked) as "질문 1 답", count(*) filter (where picked_q2) as "질문 2 답",
  count(*) filter (where scenes_picked >= 2) as "2장면 이상"
from metrics.visitor_day where day >= {{since}} group by 1 order by 2 desc$q$, 'table', null, null, null, 2, 160),
('처음 온 날별로 다시 온 사람', '그날 처음 온 사람 중 다른 날 다시 온 사람',
 $q$with v as (select visitor_id, min(day) first_day, count(*) days from metrics.visitor_day where touched group by 1)
select to_char(first_day, 'YYYY-MM-DD') as "처음 온 날", count(*) as "처음 온 사람", count(*) filter (where days >= 2) as "다시 옴"
from v where first_day >= {{since}} group by 1 order by 1$q$, 'bar', '처음 온 날', '*', null, 2, 170),
('직접 입력 AI 호출', '호출 수 · 색은 결과',
 $q$select to_char(day, 'YYYY-MM-DD') as "날짜", outcome as "결과", count(*) as "호출" from metrics.ai_call where day >= {{since}} group by 1, 2 order by 1, 2$q$,
 'bar', '날짜', '호출', '결과', 2, 180);
