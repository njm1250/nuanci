-- 기본 차트를 운영 숫자로 보고 고친다(ADR 0045).
-- 숫자판은 사람 수로 세고 분모를 같이 보여 준다. 표본이 10 미만이면 백분율을 내지 않는다. 날짜 축은 빈 날을 채운다. 결과 이름은 한국어로 바꾼다.
-- 제목으로 찾아 고치므로, 그 사이 제목을 바꾼 차트는 건드리지 않는다
update admin_chart set description = '기간 안에 한 번이라도 들어온 사람',
  sql = $q$select count(distinct visitor_id) as "방문자" from metrics.visitor_day where day >= {{since}}$q$
where title = '방문자';

update admin_chart set description = '보기를 하나라도 고른 사람', y_col = '질문 1에 답한 사람',
  sql = $q$select p as "질문 1에 답한 사람", '방문자 ' || n || '명 중' || case when n >= 10 then ' ' || round(100.0 * p / n) || '%' else '' end as "기준"
from (select count(distinct visitor_id) n, count(distinct visitor_id) filter (where picked) p from metrics.visitor_day where day >= {{since}}) t$q$
where title = '질문 1에 답한 사람';

update admin_chart set description = '장면 하나를 질문 2까지 답한 사람', y_col = '장면을 끝낸 사람',
  sql = $q$select c as "장면을 끝낸 사람", '질문 1에 답한 ' || p || '명 중' || case when p >= 10 then ' ' || round(100.0 * c / p) || '%' else '' end as "기준"
from (select count(distinct visitor_id) filter (where picked) p, count(distinct visitor_id) filter (where completed) c from metrics.visitor_day where day >= {{since}}) t$q$
where title = '장면을 끝낸 사람';

update admin_chart set description = '다른 날에도 온 적이 있는 사람', y_col = '다른 날 다시 온 사람',
  sql = $q$with v as (select visitor_id, count(*) days, max(day) last_day from metrics.visitor_day where touched group by 1)
select count(*) filter (where days >= 2) as "다른 날 다시 온 사람", '기간 안에 화면을 건드린 ' || count(*) || '명 중' as "기준" from v where last_day >= {{since}}$q$
where title = '다른 날 다시 온 사람';

update admin_chart set description = '사람 수 · 한국 날짜' where title = '날짜별 방문자 (어디서 왔나)';
update admin_chart set description = '사람 수 · 한국 날짜' where title = '날짜별 방문 → 질문 1 답 → 장면 끝냄';

update admin_chart set title = '다음 문항으로 이어 간 비율', kind = 'hbar', x_col = '자리', y_col = '이어 간 %', split_col = '종류',
  description = '% · 같은 장면 안과 장면이 바뀌는 자리를 색으로 나눔 · 앞 문항에 답한 사람이 10명 이상인 자리만',
  sql = $q$with s as (select question_no, count(*) n from metrics.question_step where day >= {{since}} group by 1)
select '문항 ' || a.question_no || ' → ' || b.question_no || ' (' || a.n || '명 중 ' || b.n || '명)' as "자리",
  case when a.question_no % 2 = 1 then '같은 장면 안' else '장면이 바뀜' end as "종류", round(100.0 * b.n / a.n) as "이어 간 %"
from s a join s b on b.question_no = a.question_no + 1 where a.n >= 10 order by a.question_no$q$
where title = '문항을 이어 간 비율';

update admin_chart set title = '첫 장면 질문 1에서 처음 고른 보기', description = '처음 온 사람이 가장 먼저 보는 장면 · 사람 수 · 색은 판정',
  sql = $q$with top as (select id as scene_id from scene where status = 'published' order by sort_order limit 1)
select p.choice_line as "보기", p.verdict_label as "판정", count(*) as "사람"
from metrics.first_pick p join top using (scene_id) where p.day >= {{since}} and p.step = 'base'
group by 1, 2 order by 3 desc$q$
where title = '가장 많이 푼 장면, 질문 1의 첫 답';

update admin_chart set title = '장면별로 어디까지 갔나' where title = '장면별 진행';

update admin_chart set description = '첫 답이 10개 이상인 질문 · 통하지 않은 말(애매함, 다르게 들림)을 처음에 고른 비율',
  sql = $q$select max(scene_title) as "장면", case step when 'base' then '질문 1' else '질문 2' end as "질문", count(*) as "첫 답",
  count(*) filter (where verdict_label in ('애매함', '다르게 들림')) as "틀림",
  round(100.0 * count(*) filter (where verdict_label in ('애매함', '다르게 들림')) / count(*)) as "오답률 %"
from metrics.first_pick where day >= {{since}} group by scene_id, step having count(*) >= 10 order by 5 desc$q$
where title = '질문별 첫 답 오답률';

update admin_chart set description = '사람 수 · 처음 화면을 떠날 때까지 · 2026-11-28부터 기록' where title = '떠나기까지 머문 시간';

update admin_chart set title = '경로별로 다시 온 사람', kind = 'table', x_col = null, y_col = null, split_col = null,
  description = '기간 안에 화면을 건드린 사람 중 다른 날에도 온 적이 있는 사람',
  sql = $q$with v as (select visitor_id, max(channel) channel, count(*) days, max(day) last_day from metrics.visitor_day where touched group by 1)
select channel as "경로", count(*) as "화면을 건드린 사람", count(*) filter (where days >= 2) as "다른 날 다시 옴"
from v where last_day >= {{since}} group by 1 order by 2 desc$q$
where title = '처음 온 날별로 다시 온 사람';

update admin_chart set description = 'AI를 부른 횟수 · 같은 표현 판별과 반응 생성을 따로 센다 · 색은 결과',
  sql = $q$with d as (select generate_series({{since}}, (now() at time zone 'Asia/Seoul')::date, interval '1 day')::date as day)
select to_char(d.day, 'YYYY-MM-DD') as "날짜",
  case a.outcome when 'blocked' then '심한 말로 걸러짐' when 'ok' then '응답함' else case when a.id is null then '응답함' else '실패' end end as "결과", count(a.id) as "호출"
from d left join metrics.ai_call a on a.day = d.day group by 1, 2 order by 1, 2$q$
where title = '직접 입력 AI 호출';
