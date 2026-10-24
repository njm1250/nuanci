-- 아지트 물건은 얻어도 기본으로 놓지 않고, 사용자가 둔 것만 놓는다. 치워 둔 목록(room_hidden) 대신 둔 목록을 저장한다.
-- 지금까지는 얻은 물건이 모두 놓여 있었으므로, 얻은 방 물건 중 치우지 않은 것을 둔 목록으로 옮긴다
alter table app_user add column room_placed varchar(800);
update app_user u set room_placed = (
    select string_agg(g.reward_id, ',' order by g.granted_at)
    from reward_grant g
    where g.owner_id = u.id
      and g.reward_id in ('plant', 'poster', 'pudding', 'fishbowl', 'cake', 'mic', 'gamepad', 'dumbbell', 'ramen', 'camera', 'vase', 'mirror',
                          'coffee', 'mirrorball', 'frame', 'rug', 'lamp', 'trophy', 'clock', 'guitar', 'lights', 'beanbag')
      and not (g.reward_id = any (string_to_array(coalesce(u.room_hidden, ''), ',')))
      and not (g.reason = 'box' and g.seen = false)
);
