#!/usr/bin/env python3
# 장면을 올리기 전 보기 자동 검사. 2026-11-22 전수 검사에서 사람이 찾은 문제를 기계가 먼저 거른다(ADR 0037).
#  1) 맞는 말 의심: 오답을 정답과 1:1로 짝지어 "이 자리에서 이것도 자연스러운가"를 따로 묻는다(ISSR, 이진 선택 검증)
#  2) 한 걸음 규칙: 한국어 따옴말에서 OPIc IM~IH 한국인이 바로 떠올릴 첫 번역인가, 두세 단계 연상(AI식)인가
#  3) 못 알아듣는 척: 상대 반응(says·reaction)이 원어민이 실제로 할 반응인가
#  4) 걸릴 법함: 보기를 섞고 판정을 가린 채, 이 집단 100명이 처음 무엇을 고를지 예측(Lee et al. ACL 2025, learner-sim)
# 판정은 서로 다른 두 모델에게 따로 받고, 둘 중 하나라도 걸면 표시한다. 사람은 표시된 것만 본다.
# 사용: python3 scripts/eval/trap-check.py drafts/claude/raj/foo.json [...]   (키: .env.production NUANCI_GEMINI_API_KEY)
import json, random, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JUDGES = ["gemini-4-neon", "gemini-3.8-flash"]
SIM = "gemini-4-neon"  # 첫 답 예측이 가장 잘 맞았던 모델(ADR 0031)
LOW = 8  # 처음 보이는 오답을 이보다 적게 고를 것으로 보이면 구경거리
EASY = 80  # 질문 1 정답을 이보다 많이 고를 것으로 보이면 너무 쉬움(정답률 90% 장면 뒤 이탈)


def key():
    for line in (ROOT / ".env.production").read_text().splitlines():
        if line.startswith("NUANCI_GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("NUANCI_GEMINI_API_KEY 없음")


def ask(model: str, prompt: str) -> dict:
    body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", json.dumps(body).encode(),
                                 {"x-goog-api-key": key(), "Content-Type": "application/json"})
    out = json.load(urllib.request.urlopen(req, timeout=180))
    text = out["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(re.sub(r"^```(json)?|```$", "", text.strip()))


def spoken(intent: str) -> str:
    i = intent.rfind(" 하고 ")
    return intent[:i] if i > 0 else intent


JUDGE_PROMPT = """You review one multiple-choice moment in an English nuance game for Korean adults (OPIc IM2~IH).
Situation (Korean): {context}
The other person ({partner}) just said: "{partnerLine}"
What the learner wants to say (Korean): {intent}
Correct answer: "{right}"

For EACH wrong option below, judge independently and answer in JSON:
{{"options": [{{"id": "...", "also_fine": true|false, "one_step": true|false, "reaction_real": true|false, "note": "one short line"}}]}}
- also_fine: put the wrong option side by side with the correct answer. Would a native speaker find the wrong option natural and fitting in THIS exact moment for THIS intent (not just grammatical)? true only if it is roughly as good as the correct answer.
- one_step: would a Korean learner, translating the Korean intent directly, plausibly produce this as their FIRST translation (literal rendering, a habit, a learned phrase)? false if it needs two or more associative leaps, or is a made-up phrase nobody uses.
- reaction_real: given the partner's spoken reply (says) and inner thought (reaction), would a real native speaker react like this? false if the partner pretends not to understand something any native would clearly understand.

Wrong options:
{wrongs}"""

SIM_PROMPT = """Predict first choices. Users: Korean adults, English OPIc IM2~IH, school-taught, translate from Korean in their head, playing casually without overthinking.
Situation (Korean): {context}
The other person said: "{partnerLine}"
What they want to say (Korean): {intent}
Options: {options}
Predict what % of 100 such users would pick each option FIRST (not which is correct). Sum 100. JSON: {{"A": n, "B": n, ...}}"""


def check(path: Path) -> int:
    scene = json.loads(path.read_text())
    flags = 0
    print(f"\n## {scene.get('id')} {scene.get('title', '')}")
    for step in ("base", "followUp"):
        s = scene[step]
        goods = [c for c in s["choices"] if c["verdict"] == "good"]
        wrongs = [c for c in s["choices"] if c["verdict"] != "good"]
        if not goods or not wrongs:
            continue
        ctx = dict(context=s["context"], partner=scene.get("partnerName", ""), partnerLine=s["partnerLine"], intent=spoken(s["intent"]), right=goods[0]["line"])
        wl = "\n".join(f'- id={c["id"]} line="{c["line"]}" says="{c.get("says", "")}" reaction="{c.get("reaction", "")}"' for c in wrongs)
        verdicts: dict[str, list] = {c["id"]: [] for c in wrongs}
        for m in JUDGES:
            try:
                for o in ask(m, JUDGE_PROMPT.format(**ctx, wrongs=wl)).get("options", []):
                    if o.get("id") in verdicts:
                        verdicts[o["id"]].append((m, o))
            except Exception as e:
                print(f"  ({m} 실패: {e})")
        # 첫 답 예측: 처음 보이는 3개를 섞고 판정을 가린다
        core = s["choices"][:3]
        letters = "ABCD"
        shuffled = core[:]
        random.Random(step + scene.get("id", "")).shuffle(shuffled)
        opts = " ".join(f'{letters[i]}) "{c["line"]}"' for i, c in enumerate(shuffled))
        share = {}
        try:
            pred = ask(SIM, SIM_PROMPT.format(context=s["context"], partnerLine=s["partnerLine"], intent=spoken(s["intent"]), options=opts))
            share = {shuffled[i]["id"]: pred.get(letters[i], 0) for i in range(len(shuffled))}
        except Exception as e:
            print(f"  (첫 답 예측 실패: {e})")
        print(f"### {step}: 「{spoken(s['intent'])}」 → {goods[0]['line']}")
        for c in s["choices"]:
            marks = []
            for m, o in verdicts.get(c["id"], []):
                short = m.replace("gemini-", "")
                if o.get("also_fine"):
                    marks.append(f"맞는 말 의심[{short}]")
                if o.get("one_step") is False:
                    marks.append(f"한 걸음 아님[{short}]")
                if o.get("reaction_real") is False:
                    marks.append(f"못 알아듣는 척[{short}]")
            p = share.get(c["id"])
            if p is not None and c["verdict"] != "good" and p < LOW:
                marks.append(f"구경거리(예측 {p}%)")
            if p is not None and c["verdict"] == "good" and step == "base" and p > EASY:
                marks.append(f"너무 쉬움(정답 예측 {p}%)")
            notes = " / ".join(o.get("note", "") for _, o in verdicts.get(c["id"], []) if o.get("note"))
            tag = {"good": "O", "meh": "△", "bad": "X"}[c["verdict"]]
            pct = f" {p}%" if p is not None else ""
            print(f"  {tag}{pct} {c['line']}" + (f"  ⚠ {', '.join(marks)}" + (f"  — {notes}" if notes else "") if marks else ""))
            flags += bool(marks)
    return flags


def main():
    if len(sys.argv) < 2:
        sys.exit("사용: trap-check.py <scene.json>...")
    total = sum(check(Path(p)) for p in sys.argv[1:])
    print(f"\n표시된 보기 {total}개. 표시된 것만 사람이 본다(두 모델 중 하나라도 걸면 표시).")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
