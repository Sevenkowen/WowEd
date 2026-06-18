#!/usr/bin/env bash
# Ejecutar en el VPS dentro del directorio del repo (ej. /opt/wowed)
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> WowEd deploy en $(pwd)"

if [[ ! -f .env ]]; then
  echo "ERROR: falta .env en la raíz del repo. Copiá deploy/.env.example y completalo."
  exit 1
fi

echo "==> git pull"
git pull origin main

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "ERROR: instalá Docker Compose (docker compose o docker-compose)"
  exit 1
fi

echo "==> docker compose build & up ($COMPOSE)"
$COMPOSE up -d --build

echo "==> esperando API healthy..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T api python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')" 2>/dev/null; then
    break
  fi
  sleep 2
done

echo "==> health"
curl -sf "http://127.0.0.1:${HTTP_PORT:-80}/api/health" | head -c 200 || true
echo ""
curl -sf "http://127.0.0.1:${HTTP_PORT:-80}/api/health/db-schema" | head -c 400 || true
echo ""

echo "==> contenedores"
$COMPOSE ps

echo "Deploy completado."
