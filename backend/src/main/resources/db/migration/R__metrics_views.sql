-- 지표의 기준을 한곳에 둔다. 어드민 보드의 차트와 SQL 콘솔이 같은 기준으로 센다(ADR 0045).
-- 반복 마이그레이션이라 이 파일을 고치면 배포할 때 다시 만들어진다. 뷰는 소유자 권한으로 원본을 읽으므로 조회 전용 역할에는 뷰 읽기 권한만 준다.
-- 시각은 모두 한국 시각으로 바꿔 둔다(ts, day). 날짜로 묶을 때 자정 기준이 한국이 되게 하기 위해서다
drop schema if exists metrics cascade;
create schema metrics;

-- 공개된 장면의 지금 버전 보기와 판정. 보기 id만으로는 무엇인지 알 수 없어서 붙인다
create view metrics.choice as
select s.id scene_id, st.step, c.value->>'id' choice_id, c.ordinality::int ord, c.value->>'line' line, c.value->>'verdict' verdict, c.value->>'trap' trap,
  v.content->st.step->>'intent' intent
from scene s
join scene_version v on v.scene_id = s.id and v.version = s.current_version
cross join (values ('base'), ('followUp')) st(step)
cross join lateral json_array_elements(coalesce((v.content->st.step->'choices')::json, '[]'::json)) with ordinality c(value, ordinality);

-- 방문자 한 사람 한 줄. counted가 참인 사람만 지표에 넣는다: 내부 방문, 봇, 출시 전 안드로이드 앱 방문을 뺀다
create view metrics.visitor as
with first_seen as (select visitor_id, min(created_at) t0 from scene_event group by 1)
select f.visitor_id,
  (f.t0 at time zone 'Asia/Seoul') first_ts,
  (f.t0 at time zone 'Asia/Seoul')::date first_day,
  case
    when s.source ilike '%geeknews%' or s.referrer ilike '%hada%' then '긱뉴스'
    when s.source = 'android_app' then '안드로이드 앱'
    when coalesce(s.source, s.referrer) ~* 'chatgpt|openai|perplexity|claude|gemini' then 'AI 검색'
    when coalesce(s.source, s.referrer) ~* 'google|naver|bing|daum|duckduckgo' then '검색'
    when coalesce(s.source, s.referrer) ~* 'disquiet' then '디스콰이엇'
    when coalesce(s.source, s.referrer) ~* 'instagram|threads|facebook|youtube|tiktok|x[.]com|twitter|t[.]co' then 'SNS'
    when coalesce(s.source, s.referrer) ~* 'kakao|discord|slack|everytime|share' then '지인 공유'
    when s.source is null and s.referrer is null then '기록 없음'
    else '기타'
  end channel,
  s.source, s.medium, s.campaign, s.referrer,
  case when c.user_agent ~* 'iphone|ipad' then 'iOS' when c.user_agent ~* 'android' then 'Android'
       when c.user_agent ~* 'macintosh' then 'Mac' when c.user_agent ~* 'windows' then 'Windows'
       when c.user_agent ~* 'linux' then 'Linux' else '기타' end os,
  case when c.user_agent ~* 'iphone|ipad|android|mobile' then '모바일' else '데스크톱' end device,
  (i.visitor_id is not null) is_internal,
  (c.client = 'bot') is_bot,
  (s.source = 'android_app') is_android_app,
  (i.visitor_id is null and coalesce(c.client, '') <> 'bot' and coalesce(s.source, '') <> 'android_app') counted
from first_seen f
left join visitor_source s using (visitor_id)
left join visitor_client c using (visitor_id)
left join internal_visitor i using (visitor_id);

-- 이벤트 한 건 한 줄(지표에 넣는 방문자만). 방문자 속성과 보기 문장·판정을 붙여 둔다
create view metrics.event as
select e.id, e.type, e.scene_id, e.step, e.choice_id, e.entry, e.visitor_id, e.attempt_id,
  (e.created_at at time zone 'Asia/Seoul') ts,
  (e.created_at at time zone 'Asia/Seoul')::date "day",
  v.first_day, ((e.created_at at time zone 'Asia/Seoul')::date = v.first_day) on_first_day,
  v.channel, v.os, v.device,
  sc.title scene_title, sc.number scene_number, (e.scene_id like 'dev-%') is_dev_pack,
  ch.line choice_line, ch.verdict choice_verdict,
  case ch.verdict when 'good' then '통함' when 'meh' then '애매함' when 'bad' then '다르게 들림' end verdict_label
from scene_event e
join metrics.visitor v on v.visitor_id = e.visitor_id and v.counted
left join scene sc on sc.id = e.scene_id
left join metrics.choice ch on ch.scene_id = e.scene_id and ch.step = e.step and ch.choice_id = e.choice_id;

-- 방문자의 하루 한 줄: 그날 어디까지 갔나. 떠난 기록(page_left)만 있는 날은 방문으로 치지 않는다(탭을 다음 날 닫으면 생긴다)
create view metrics.visitor_day as
select e.visitor_id, e."day", min(e.ts) first_ts, bool_or(e.on_first_day) is_new, max(e.channel) channel, max(e.os) os, max(e.device) device,
  (bool_or(e.type = 'page_engaged') or bool_or(e.type = 'choice_selected')) touched,
  bool_or(e.type = 'choice_selected') picked,
  bool_or(e.type = 'choice_selected' and e.step = 'followUp') picked_q2,
  bool_or(e.type = 'scene_completed') completed,
  count(distinct e.scene_id) filter (where e.type = 'choice_selected') scenes_picked,
  count(distinct e.scene_id) filter (where e.type = 'scene_completed') scenes_completed,
  count(*) filter (where e.type = 'alternative_viewed') alt_views,
  bool_or(e.type = 'next_clicked') clicked_next,
  bool_or(e.type = 'free_line_opened') opened_free,
  max(case when e.type = 'page_left' and e.choice_id ~ '^[0-9]+$' then e.choice_id::int end) left_after_sec
from metrics.event e
group by 1, 2
having bool_or(e.type <> 'page_left');

-- 질문마다 그 사람이 처음 고른 보기(다른 보기 눌러 보기는 뺀다)
create view metrics.first_pick as
select distinct on (e.visitor_id, e.scene_id, e.step)
  e.visitor_id, e.scene_id, e.scene_title, e.is_dev_pack, e.step, e.choice_id,
  coalesce(e.choice_line, case when e.choice_id like 'own-%' then '(직접 입력)' else e.choice_id end) choice_line,
  coalesce(e.verdict_label, case when e.choice_id like 'own-%' then '직접 입력' else '알 수 없음' end) verdict_label,
  e.ts, e."day", e.channel, e.device, e.on_first_day
from metrics.event e
where e.type = 'choice_selected' and e.step in ('base', 'followUp')
order by e.visitor_id, e.scene_id, e.step, e.ts;

-- 그 사람이 그날 몇 번째 문항까지 답했나. 홀수 → 짝수는 같은 장면 안, 짝수 → 홀수는 장면이 바뀌는 자리
create view metrics.question_step as
select p.visitor_id, p."day", p.channel, p.device, p.scene_id, p.step, p.verdict_label,
  row_number() over (partition by p.visitor_id, p."day" order by p.ts) question_no
from metrics.first_pick p;

-- 다른 보기를 눌러 본 기록(무엇을 궁금해했나)
create view metrics.alt_view as
select e.visitor_id, e.ts, e."day", e.channel, e.scene_id, e.scene_title, e.step,
  coalesce(e.choice_line, e.choice_id) choice_line, coalesce(e.verdict_label, '알 수 없음') verdict_label
from metrics.event e where e.type = 'alternative_viewed';

-- 직접 입력 AI 호출(평가 호출은 뺀다)
create view metrics.ai_call as
select a.id, (a.created_at at time zone 'Asia/Seoul') ts, (a.created_at at time zone 'Asia/Seoul')::date "day",
  a.feature, a.prompt_version, a.model, a.outcome, a.latency_ms, a.input_tokens, a.output_tokens, a.scene_id, a.visitor_id
from ai_call a
left join metrics.visitor v on v.visitor_id = a.visitor_id
where a.feature not like 'eval%' and coalesce(v.counted, true);

grant usage on schema metrics to nuanci_query_reader;
grant select on all tables in schema metrics to nuanci_query_reader;
