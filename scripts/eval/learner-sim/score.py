#!/usr/bin/env python3
# 모델이 예측한 첫 선택 분포를 실제 첫 답과 대조한다. 지표는 결과를 보기 전에 고정했다(ADR 0031).
# 1) 첫 답 1회당 평균 로그우도: 기준선 = 균등 분포, 정답 쏠림(정답 60%·나머지 균등)
# 2) 1위 일치: 모델 1위 보기가 실제 최다 선택(동률 포함)인 질문 수
# 3) 놓친 함정: 모델이 5% 이하로 본 보기를 실제로 20% 이상 고른 경우
# 사용: python3 score.py <truth.json> <pred.json>...   (pred 형식: {"Q1": {"A": 60, "B": 40}, ...})
import json, math, sys

FLOOR = 0.01  # 0%로 예측한 보기를 누가 골라도 점수가 무한히 깎이지 않게


def loglik(pred, picks):
    return sum(n * math.log(max(pred.get(k, 0) / 100, FLOOR)) for k, n in picks.items())


def baseline(t, kind):
    keys = list(t["lines"])
    goods = [k for k in keys if t["verdicts"][k] == "good"]
    if kind == "균등" or not goods:
        return {k: 100 / len(keys) for k in keys}
    rest = len(keys) - len(goods)
    return {k: 60 / len(goods) if k in goods else 40 / max(rest, 1) for k in keys}


def score(truth, preds):
    total = sum(sum(t["picks"].values()) for t in truth)
    ll = sum(loglik(preds[t["item"]], t["picks"]) for t in truth) / total
    top = missed = 0
    misses = []
    for t in truth:
        p = {k: v for k, v in preds[t["item"]].items() if k in t["lines"]}
        n_all = sum(t["picks"].values())
        best = max(t["picks"].values())
        top += t["picks"].get(max(p, key=p.get), 0) == best
        for k, n in t["picks"].items():
            if p.get(k, 0) <= 5 and n / n_all >= 0.2:
                misses.append(f"{t['scene']} {t['step']} v{t['version']} {t['lines'][k]!r} 예측 {p.get(k, 0)}% / 실제 {round(100 * n / n_all)}%")
    return ll, top, misses


def main():
    truth = json.load(open(sys.argv[1]))
    for kind in ["균등", "정답 쏠림"]:
        ll, top, _ = score(truth, {t["item"]: baseline(t, kind) for t in truth})
        print(f"[기준선 {kind}] 로그우도 {ll:.3f}")
    for path in sys.argv[2:]:
        ll, top, misses = score(truth, json.load(open(path)))
        print(f"[{path}] 로그우도 {ll:.3f} · 1위 일치 {top}/{len(truth)} · 놓친 함정 {len(misses)}")
        for m in misses:
            print("   ", m)


if __name__ == "__main__":
    main()
