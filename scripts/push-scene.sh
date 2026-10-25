#!/usr/bin/env bash
# 장면 JSON 파일을 실행 중인 BE에 올린다. 새 장면은 초안으로 들어가고, 있는 장면은 새 버전이 된다
# 사용법: scripts/push-scene.sh [--check] drafts/claude/foo.json [...]
#   NUANCI_API (기본 http://localhost:8080), NUANCI_SITE (캐시를 비울 FE, 기본은 API에 맞춰 정함), NUANCI_ADMIN_ID (기본 admin), NUANCI_ADMIN_PASSWORD (기본 admin)
set -euo pipefail

API="${NUANCI_API:-http://localhost:8080}"
# 캐시를 비울 FE 주소. 운영 BE에 올리면 운영 화면을 비운다
if [[ "$API" == "https://api.nuanci.app" ]]; then SITE="${NUANCI_SITE:-https://nuanci.app}"; else SITE="${NUANCI_SITE:-http://localhost:3000}"; fi
DRY_RUN=false
if [[ "${1:-}" == "--check" ]]; then
  DRY_RUN=true
  shift
fi
[[ $# -gt 0 ]] || { echo "사용법: $0 [--check] <scene.json>..." >&2; exit 1; }

LOGIN=$(jq -n --arg id "${NUANCI_ADMIN_ID:-admin}" --arg pw "${NUANCI_ADMIN_PASSWORD:-admin}" '{id: $id, password: $pw}')
TOKEN=$(curl -sf -X POST "$API/api/admin/login" -H 'Content-Type: application/json' -d "$LOGIN" | jq -r .token) || {
  echo "로그인 실패: $API" >&2
  exit 1
}

for file in "$@"; do
  id=$(jq -r .id "$file")
  res=$(curl -s -w '\n%{http_code}' -X PUT "$API/api/admin/scenes/$id?dryRun=$DRY_RUN" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' --data-binary "@$file")
  code=$(tail -n1 <<<"$res")
  body=$(sed '$d' <<<"$res")
  if [[ "$code" == 200 ]]; then
    echo "$id: $(jq -r '(if .created then "새 장면" elif .changed then "버전 \(.version)" else "변경 없음" end) + (if (.warnings | length) > 0 then " · 경고: " + (.warnings | join(", ")) else "" end)' <<<"$body")"
  else
    echo "$id: 실패 ($code) $(jq -r '.message // empty' <<<"$body" 2>/dev/null)" >&2
  fi
done

# 공개 화면은 장면을 몇 분씩 캐시해서, 올린 뒤 바로 비워야 새 내용이 보인다
if [[ "$DRY_RUN" == false ]]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$SITE/admin/revalidate" -H "Cookie: nuanci_admin=$TOKEN")
  [[ "$code" == 204 ]] || echo "화면 캐시를 비우지 못했어요 ($SITE, $code). 몇 분 뒤에 반영돼요" >&2
fi
curl -s -o /dev/null -X POST "$API/api/admin/logout" -H "Authorization: Bearer $TOKEN"
