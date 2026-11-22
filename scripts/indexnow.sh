#!/usr/bin/env bash
# 사이트맵의 주소를 IndexNow(Bing·Yandex 등)에 한 번에 알린다. 배포 뒤 새 페이지가 생겼을 때 돌린다.
# 키 확인 파일은 frontend/src/app/ab3cd32016971d8b3292d636a61bc5f4.txt/route.ts 가 내준다
set -euo pipefail
SITE="${SITE:-https://nuanci.app}"
KEY="ab3cd32016971d8b3292d636a61bc5f4"
urls=$(curl -sf "$SITE/sitemap.xml" | grep -o "<loc>[^<]*" | sed 's/<loc>//' | jq -R . | jq -s .)
body=$(jq -n --arg host "${SITE#https://}" --arg key "$KEY" --arg loc "$SITE/$KEY.txt" --argjson urls "$urls" '{host:$host,key:$key,keyLocation:$loc,urlList:$urls}')
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' -d "$body")
echo "IndexNow: $(jq 'length' <<<"$urls")개 주소, 응답 $code (200·202면 접수)"
