#!/usr/bin/env bash
# DB에 있는 장면 전체(초안·숨김 포함)와 함정·판정 구성 분포를 마크다운으로 뽑는다. 새 장면을 쓰기 전에 겹치는 소재를 확인하는 용도
# 사용법: scripts/list-scenes.sh [출력 파일 (기본 drafts/existing-scenes.md)]
#   NUANCI_API (기본 http://localhost:8080), NUANCI_ADMIN_ID (기본 admin), NUANCI_ADMIN_PASSWORD (기본 admin)
set -euo pipefail

API="${NUANCI_API:-http://localhost:8080}"
OUT="${1:-drafts/existing-scenes.md}"

LOGIN=$(jq -n --arg id "${NUANCI_ADMIN_ID:-admin}" --arg pw "${NUANCI_ADMIN_PASSWORD:-admin}" '{id: $id, password: $pw}')
TOKEN=$(curl -sf -X POST "$API/api/admin/login" -H 'Content-Type: application/json' -d "$LOGIN" | jq -r .token) || {
  echo "로그인 실패: $API" >&2
  exit 1
}
get() { curl -sf "$API$1" -H "Authorization: Bearer $TOKEN"; }

scenes=$(get /api/admin/scenes | jq -r '.[].id' | while read -r id; do get "/api/admin/scenes/$id"; done | jq -s 'sort_by(.number)')
mix=$(get /api/admin/scenes/mix)
curl -s -o /dev/null -X POST "$API/api/admin/logout" -H "Authorization: Bearer $TOKEN"

mkdir -p "$(dirname "$OUT")"
jq -rn --argjson scenes "$scenes" --argjson mix "$mix" --arg api "$API" --arg at "$(date '+%Y-%m-%d %H:%M')" '
  def traps: {literal: "직역", konglish: "콩글리시", answer: "대답 방식", textbook: "교과서식", blunt: "너무 직설적", formal: "너무 격식", context: "맥락 어긋남", misread: "다른 뜻으로 들림", culture: "문화 차이"};
  def status: {draft: "초안", published: "공개", hidden: "숨김"}[.] // .;
  # 장면 하나를 한 줄로: 정답과 함정(X, 없으면 △) 표현만 남겨 겹치는 표현·소재를 빨리 훑게 한다
  def wrong: [.choices[] | select(.verdict == "bad")] as $bad | if ($bad | length) > 0 then $bad else [.choices[] | select(.verdict == "meh")] end;
  def situation: ([.choices[] | select(.verdict == "good") | .line] | join(" / ")) + " ✗ " + ([wrong[] | .line + (if .trap then "(\(traps[.trap] // .trap))" else "" end)] | join(" / "));
  "# 지금 있는 장면",
  "",
  "\($at) 기준, \($api)에서 뽑음. 장면 \($scenes | length)개, 상황 \($mix.situations)개. 숨긴 장면도 번호와 소재를 다시 쓰지 않는다.",
  "한 줄 형식: #번호 제목 · 상대 · 장소 | 질문 1 정답 ✗ 함정 | 질문 2 정답 ✗ 함정",
  "",
  "## 함정 유형 분포 (초안·공개)",
  "",
  ($mix.traps | to_entries | sort_by(-.value) | map("\(traps[.key] // .key) \(.value)") | join(" · ")),
  "",
  "## 판정 구성 분포",
  "",
  ($mix.compositions | to_entries | map("\(.key) \(.value)") | join(" · ")),
  (if ($mix.warnings | length) > 0 then "", "경고:", ($mix.warnings[] | "- \(.)") else empty end),
  "",
  "## 장면",
  "",
  ($scenes[] |
    "- #\(.number) \(.title)" + (if .status == "published" then "" else " [\(.status | status)]" end)
    + " · \(.partnerName) · \(.place) | \(.base | situation) | \(.followUp | situation)")
' >"$OUT"

echo "$OUT: 장면 $(jq length <<<"$scenes")개"
