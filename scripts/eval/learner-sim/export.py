#!/usr/bin/env python3
# 운영 DB에서 첫 답이 모인 질문(장면·단계·버전별 외부 사람 첫 답 MIN_PICKS개 이상)을 뽑아
# 모델에게 줄 문항(items.json, 정답·판정 없음)과 채점용 실제 분포(truth.json)를 따로 만든다.
# truth.json은 모델이 읽지 못하는 곳에 둔다.
# 사용: python3 scripts/eval/learner-sim/export.py <문항 폴더> <정답 폴더>
import json, random, subprocess, sys
from pathlib import Path

MIN_PICKS = 6
ROOT = Path(__file__).resolve().parents[3]
SQL = f"""
with fp as (
  select distinct on (e.scene_id, e.step, e.visitor_id) e.scene_id, e.step, e.visitor_id, e.scene_version, e.choice_id
  from scene_event e
  where e.type = 'choice_selected' and e.scene_id is not null and e.step in ('base','followUp')
    and not exists (select 1 from internal_visitor i where i.visitor_id = e.visitor_id)
    and not exists (select 1 from visitor_client c where c.visitor_id = e.visitor_id and c.client = 'bot')
  order by e.scene_id, e.step, e.visitor_id, e.created_at, e.id
), g as (select scene_id, step, scene_version from fp group by 1,2,3 having count(*) >= {MIN_PICKS})
select g.scene_id, g.step, g.scene_version, v.content->g.step as sit,
  (select json_agg(json_build_array(x.choice_id, x.n)) from (select f2.choice_id, count(*) n from fp f2
     where f2.scene_id=g.scene_id and f2.step=g.step and f2.scene_version=g.scene_version group by f2.choice_id) x) as picks,
  v.content->>'title' as title, v.content->>'relation' as relation
from g join scene_version v on v.scene_id = g.scene_id and v.version = g.scene_version
order by g.scene_id, g.step, g.scene_version
"""


def main():
    if len(sys.argv) != 3:
        sys.exit("사용: export.py <문항 폴더> <정답 폴더>")
    items_dir, truth_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out = subprocess.run([sys.executable, str(ROOT / "scripts/admin-query.py"), "-"], input=SQL,
                         capture_output=True, text=True, check=True).stdout
    rows = json.loads(out)["rows"]
    rng = random.Random(7)
    items, truth = [], []
    for i, (sid, step, ver, sit, picks, title, rel) in enumerate(rows):
        sit = json.loads(sit) if isinstance(sit, str) else sit
        picks = json.loads(picks) if isinstance(picks, str) else picks
        choices = sit["choices"]
        order = list(range(len(choices)))
        rng.shuffle(order)  # 정답 위치로 맞히지 못하게 보기 순서를 섞는다
        letter = {choices[j]["id"]: "ABCDE"[k] for k, j in enumerate(order)}
        options = {letter[c["id"]]: c["line"] for c in choices}
        q = f"Q{i + 1}"
        items.append(dict(item=q, title=title, relation=rel, context=sit.get("context"), intent=sit.get("intent"),
                          partnerLine=sit.get("partnerLine"), options=options))
        truth.append(dict(item=q, scene=sid, step=step, version=ver, lines=options,
                          picks={letter[c]: n for c, n in picks if c in letter},
                          verdicts={letter[c["id"]]: c.get("verdict", c.get("kind")) for c in choices}))
    items_dir.mkdir(parents=True, exist_ok=True)
    truth_dir.mkdir(parents=True, exist_ok=True)
    (items_dir / "items.json").write_text(json.dumps(items, ensure_ascii=False, indent=1))
    (truth_dir / "truth.json").write_text(json.dumps(truth, ensure_ascii=False, indent=1))
    print(f"문항 {len(items)}개, 첫 답 {sum(sum(t['picks'].values()) for t in truth)}회")


if __name__ == "__main__":
    main()
