#!/usr/bin/env bash
set -euo pipefail

MODE=${1:-}
ACTION=${2:-}
MESSAGE=${3:-}

if [[ -z "$MODE" || -z "$ACTION" ]]; then
  echo "Uso: scripts/manage.sh dev|prod migrate|build-assets|revision|admin-create|status [mensaje]"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$MODE" == "dev" ]]; then
  COMPOSE=(docker compose -f "$ROOT_DIR/docker-compose.yml")
elif [[ "$MODE" == "prod" ]]; then
  COMPOSE=(docker compose -f "$ROOT_DIR/docker-compose.prod.yml")
else
  echo "Modo inválido: $MODE"
  exit 1
fi

ensure_web_running() {
  local running
  running=$("${COMPOSE[@]}" ps --services --filter "status=running" | grep -x "web" || true)
  if [[ -z "$running" ]]; then
    echo "El servicio web no está activo. Ejecuta deploy primero."
    exit 1
  fi
}

ensure_assets_running() {
  local running
  running=$("${COMPOSE[@]}" ps --services --filter "status=running" | grep -x "assets-watcher" || true)
  if [[ -z "$running" ]]; then
    echo "El servicio de assets no está activo. Ejecuta deploy primero."
    exit 1
  fi
}

case "$ACTION" in
  migrate)
    ensure_web_running
    "${COMPOSE[@]}" exec web alembic upgrade head
    ;;
  revision)
    if [[ -z "$MESSAGE" ]]; then
      echo "Uso: scripts/manage.sh $MODE revision \"mensaje\""
      exit 1
    fi
    ensure_web_running
    "${COMPOSE[@]}" exec web alembic revision --autogenerate -m "$MESSAGE"
    ;;
  build-assets)
    ensure_assets_running
    "${COMPOSE[@]}" exec assets-watcher npm run build
    ;;
  admin-create)
    ensure_web_running
    "${COMPOSE[@]}" exec web flask create-admin
    ;;
  status)
    "${COMPOSE[@]}" ps
    ;;
  *)
    echo "Acción inválida: $ACTION"
    echo "Uso: scripts/manage.sh dev|prod migrate|revision|admin-create|status [mensaje]"
    exit 1
    ;;
esac
