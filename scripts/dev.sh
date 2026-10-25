#!/usr/bin/env bash
# 로컬 개발 서버(DB, BE, FE)를 백그라운드로 띄우고 내리는 스크립트
# 사용법: scripts/dev.sh {up|down|restart|status|logs <be|fe> [줄수]|db-reset|seed}
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.dev"
BE_PORT=8080
FE_PORT=3000
BE_URL="http://localhost:$BE_PORT/actuator/health"
FE_URL="http://localhost:$FE_PORT"

mkdir -p "$RUN_DIR"

pids_on_port() { lsof -tiTCP:"$1" -sTCP:LISTEN || true; }

wait_for() {
  local name=$1 url=$2 timeout=$3
  if curl -sf -o /dev/null --retry "$timeout" --retry-delay 1 --retry-connrefused --retry-all-errors "$url"; then
    echo "$name 준비 완료: $url"
  else
    echo "$name 시작 실패, 로그: $RUN_DIR/$name.log" >&2
    tail -n 30 "$RUN_DIR/$name.log" >&2
    return 1
  fi
}

start_be() {
  if [[ -n "$(pids_on_port $BE_PORT)" ]]; then
    echo "be 이미 실행 중"
    return
  fi
  # 로컬 관리자 계정 기본값은 admin / admin
  export NUANCI_ADMIN_PASSWORD="${NUANCI_ADMIN_PASSWORD:-admin}"
  # bootRun이 compose.yaml의 Postgres도 같이 띄운다
  # 서브셸이 호출한 쪽의 출력을 붙잡지 않도록 입출력을 모두 끊고 띄운다
  (cd "$ROOT/backend" || exit 1; nohup ./gradlew bootRun >"$RUN_DIR/be.log" 2>&1 </dev/null &)
}

start_fe() {
  if [[ -n "$(pids_on_port $FE_PORT)" ]]; then
    echo "fe 이미 실행 중"
    return
  fi
  [[ -d "$ROOT/frontend/node_modules" ]] || (cd "$ROOT/frontend" && npm install)
  (cd "$ROOT/frontend" || exit 1; nohup npm run dev >"$RUN_DIR/fe.log" 2>&1 </dev/null &)
}

stop_port() {
  local name=$1 port=$2 pids
  pids=$(pids_on_port "$port")
  if [[ -n "$pids" ]]; then
    kill $pids
    echo "$name 종료"
  else
    echo "$name 실행 중 아님"
  fi
}

up() {
  start_be
  start_fe
  # 첫 실행은 Postgres 이미지 다운로드 때문에 오래 걸린다
  wait_for be "$BE_URL" 240
  wait_for fe "$FE_URL" 60
}

down() {
  stop_port fe $FE_PORT
  stop_port be $BE_PORT
  docker compose -f "$ROOT/compose.yaml" down
}

status() {
  [[ -n "$(pids_on_port $BE_PORT)" ]] && echo "be: 실행 중 ($BE_URL)" || echo "be: 중지"
  [[ -n "$(pids_on_port $FE_PORT)" ]] && echo "fe: 실행 중 ($FE_URL)" || echo "fe: 중지"
  docker compose -f "$ROOT/compose.yaml" ps --format 'db: {{.Status}}'
}

case "${1:-}" in
  up) up ;;
  down) down ;;
  restart) down && up ;;
  status) status ;;
  logs) tail -n "${3:-50}" "$RUN_DIR/${2:?be 또는 fe}.log" ;;
  db-reset) docker compose -f "$ROOT/compose.yaml" down -v ;;
  # 장면의 원본은 DB라서, 빈 DB에는 테스트용 장면 JSON을 올려 채운다
  seed) "$ROOT/scripts/push-scene.sh" "$ROOT"/backend/src/test/resources/scenes/*.json ;;
  *)
    echo "사용법: $0 {up|down|restart|status|logs <be|fe> [줄수]|db-reset|seed}" >&2
    exit 1
    ;;
esac
