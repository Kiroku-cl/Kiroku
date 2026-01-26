#!/usr/bin/env bash
set -euo pipefail

MODE=${1:-}
ACTION=${2:-up}

if [[ -z "$MODE" ]]; then
  echo "Uso: scripts/deploy.sh dev|prod [down]"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$MODE" in
  dev)
    if [[ "$ACTION" == "down" ]]; then
      docker compose -f "$ROOT_DIR/docker-compose.yml" down
      exit 0
    fi

    if [[ ! -f "$ROOT_DIR/.env" && -f "$ROOT_DIR/env.example" ]]; then
      cp "$ROOT_DIR/env.example" "$ROOT_DIR/.env"
    fi

    docker compose -f "$ROOT_DIR/docker-compose.yml" up -d --build

    echo "Esperando bundles..."
    start_time=$(date +%s)
    timeout=120
    while true; do
      if [[ -f "$ROOT_DIR/static/dist/app.min.js" && -f "$ROOT_DIR/static/dist/admin.min.js" ]]; then
        echo "Bundles listos."
        break
      fi

      now=$(date +%s)
      elapsed=$((now - start_time))
      if (( elapsed > timeout )); then
        echo "Timeout esperando bundles. Revisa assets-watcher con docker compose logs assets-watcher."
        exit 1
      fi
      sleep 2
    done
    ;;
  prod)
    if [[ "$ACTION" == "down" ]]; then
      docker compose -f "$ROOT_DIR/docker-compose.prod.yml" stop web
      exit 0
    fi

    docker compose -f "$ROOT_DIR/docker-compose.prod.yml" up -d --build
    docker compose -f "$ROOT_DIR/docker-compose.prod.yml" exec web alembic upgrade head
    ;;
  *)
    echo "Modo inválido: $MODE"
    echo "Uso: scripts/deploy.sh dev|prod [down]"
    exit 1
    ;;
esac
