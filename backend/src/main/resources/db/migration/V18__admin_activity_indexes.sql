create index scene_event_visitor_recent_idx on scene_event (visitor_id, created_at desc, id desc);
create index scene_event_user_recent_idx on scene_event (user_id, created_at desc, id desc) where user_id is not null;
create index user_visitor_user_idx on user_visitor (user_id);
