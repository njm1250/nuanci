#!/usr/bin/env python3
# "내 말로 해 보기" 확인(holdout) 평가. 프롬프트를 만들고 고칠 때 한 번도 쓰지 않은 장면의 입력으로, 라벨을 먼저 얼려 두고 잰다.
# 설계 셋을 같은 입력으로 비교한다: baseline(지금 서비스) / intent-in-match(매칭에 의도를 넘김) / single-call(한 호출로).
# 사용: python3 scripts/eval-free-line-holdout.py [--runs 3] [--variants baseline,intent-in-match,single-call] [--api http://localhost:8080]
#   관리자 로그인은 NUANCI_ADMIN_ID / NUANCI_ADMIN_PASSWORD(기본 admin/admin). 결과는 scripts/eval/results/ 에 시각별로 남긴다.
import argparse, collections, concurrent.futures as cf, datetime, json, os, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
CASES = ROOT / "eval" / "free-line-holdout.json"


def post(url, body, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, json.dumps(body).encode(), headers)
    return json.load(urllib.request.urlopen(req, timeout=120))


def judge(case, r):
    """한 입력의 결과를 칸 하나로 분류한다."""
    got_id = r.get("matchedChoiceId")
    if case["label"] != "none":
        if got_id == case["label"]:
            return "match_ok"
        return "match_wrong" if got_id else "match_missed"
    if got_id:
        return "false_match"  # 보기에 없어야 할 말을 검증된 보기에 붙임: 엉뚱한 해설이 나가는 가장 위험한 실패
    want = case["verdict"]
    if want in ("off_topic", "too_far"):
        return "filter_ok" if r["outcome"] == want else "filter_wrong"
    if r["outcome"] != "reacted":
        return "react_missing"
    return "verdict_ok" if r.get("verdict") == want else "verdict_wrong"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--variants", default="baseline,intent-in-match,single-call")
    ap.add_argument("--api", default="http://localhost:8080")
    ap.add_argument("--cases", default=str(CASES), help="얼린 확인 세트 파일(1차 free-line-holdout.json, 2차 free-line-holdout-2.json)")
    a = ap.parse_args()
    cases = json.load(open(a.cases))
    token = post(f"{a.api}/api/admin/login", {"id": os.environ.get("NUANCI_ADMIN_ID", "admin"), "password": os.environ.get("NUANCI_ADMIN_PASSWORD", "admin")})["token"]

    def one(job):
        variant, run, i = job
        c = cases[i]
        r = post(f"{a.api}/api/admin/eval/free-line", {"sceneId": c["sceneId"], "step": c.get("step", "base"), "text": c["text"], "variant": variant}, token)
        return variant, run, i, r, judge(c, r)

    jobs = [(v, run, i) for v in a.variants.split(",") for run in range(a.runs) for i in range(len(cases))]
    rows = []
    with cf.ThreadPoolExecutor(6) as ex:
        for out in ex.map(one, jobs):
            rows.append(out)

    n_opt = sum(c["label"] != "none" for c in cases)
    n_none = len(cases) - n_opt
    n_verdict = sum(c["label"] == "none" and c["verdict"] in ("good", "meh", "bad") for c in cases)
    n_filter = n_none - n_verdict
    print(f"확인 세트 {len(cases)}개 (보기와 같은 말 {n_opt}, 보기에 없는 말 {n_none}: 판정 {n_verdict}, 거르기 {n_filter}) × {a.runs}회\n")
    summary = {}
    for v in a.variants.split(","):
        per_run = []
        for run in range(a.runs):
            k = collections.Counter(j for vv, rr, _, _, j in rows if vv == v and rr == run)
            per_run.append(k)
        def avg(key):
            return sum(k[key] for k in per_run) / a.runs
        s = {
            "매칭 정확(같은 말을 맞는 보기에)": f"{avg('match_ok'):.1f}/{n_opt}",
            "다른 보기에 붙임": f"{avg('match_wrong'):.1f}/{n_opt}",
            "놓침(같은 말인데 none)": f"{avg('match_missed'):.1f}/{n_opt}",
            "잘못 붙임(보기에 없는 말을 보기에)": f"{avg('false_match'):.1f}/{n_none}",
            "판정 일치(good/meh/bad)": f"{avg('verdict_ok'):.1f}/{n_verdict}",
            "거르기 일치(off_topic/too_far)": f"{avg('filter_ok'):.1f}/{n_filter}",
            "오답 해설 위험(다른 보기+잘못 붙임)": f"{avg('match_wrong') + avg('false_match'):.1f}/{len(cases)}",
        }
        summary[v] = {"metrics": s, "per_run": [dict(k) for k in per_run]}
        print(f"[{v}]")
        for key, val in s.items():
            print(f"  {key:28} {val}")
        print()

    outdir = ROOT / "eval" / "results"
    outdir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
    detail = [{"variant": v, "run": run, **cases[i], "got": r, "judge": j} for v, run, i, r, j in rows]
    (outdir / f"{pathlib.Path(a.cases).stem}-{stamp}.json").write_text(json.dumps({"summary": summary, "rows": detail}, ensure_ascii=False, indent=1))
    print(f"자세한 결과: {outdir / (pathlib.Path(a.cases).stem + '-' + stamp + '.json')}")


if __name__ == "__main__":
    main()
