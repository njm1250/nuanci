-- 방문자가 처음 어디서 들어왔는지(utm 꼬리표 또는 다른 사이트 주소) 한 번만 남긴다. 채널별 지표를 나눠 보는 데 쓴다
create table visitor_source (
	visitor_id uuid primary key,
	source varchar(100),
	medium varchar(100),
	campaign varchar(100),
	referrer varchar(255),
	created_at timestamptz not null default now()
);
