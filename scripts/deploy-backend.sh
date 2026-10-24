#!/usr/bin/env bash
# 로컬의 BE 소스를 서버로 보내 Docker 이미지를 빌드하고 다시 띄운다 (레포가 private이라 서버에서 clone하지 않는다)
# 사용법: NUANCI_SERVER=ubuntu@1.2.3.4 scripts/deploy-backend.sh
# 서버의 ~/nuanci/.env 에 API_DOMAIN, POSTGRES_PASSWORD, NUANCI_ADMIN_PASSWORD 가 있어야 한다
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="${NUANCI_SERVER:?NUANCI_SERVER=ubuntu@<서버 IP> 가 필요해요}"

ssh "$SERVER" 'mkdir -p nuanci/backend'
# 서버의 .env는 건드리지 않도록 backend 폴더만 지우며 맞추고, 나머지 파일은 덮어쓰기만 한다
rsync -az --delete --exclude build --exclude .gradle "$ROOT/backend/" "$SERVER:nuanci/backend/"
rsync -az "$ROOT/compose.prod.yaml" "$ROOT/Caddyfile" "$ROOT/.dockerignore" "$SERVER:nuanci/"

ssh "$SERVER" 'cd nuanci && docker compose -f compose.prod.yaml up -d --build && docker image prune -f >/dev/null'
echo "배포 완료. 상태: ssh $SERVER 'cd nuanci && docker compose -f compose.prod.yaml ps'"
