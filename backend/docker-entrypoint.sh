#!/bin/sh
set -e

echo "[entrypoint] Ejecutando migraciones..."
python scripts/run_migrations.py

echo "[entrypoint] Iniciando API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
