# WowEd API (Python / FastAPI)

## Requisitos

- Python 3.11+
- PostgreSQL accesible (VPS)

## Setup local

**Importante:** ejecutá estos comandos desde la carpeta del proyecto WowEd, no desde `C:\WINDOWS\system32`.

```powershell
cd E:\WowEd\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
copy .env.example .env
# Editá .env con DATABASE_URL (postgresql+psycopg://...) y SECRET_KEY
```

Si `pip` no se reconoce, usá siempre `py -m pip` en lugar de `pip`.

**Python 3.14:** si falla al instalar `pydantic`, actualizá pip (`py -m pip install -U pip`) o instalá [Python 3.12](https://www.python.org/downloads/) y creá el venv con `py -3.12 -m venv .venv`.

## Migraciones de base de datos

Ejecutá **una vez** (usa `DATABASE_URL` de tu `.env`):

```powershell
cd E:\WowEd\backend
.\.venv\Scripts\Activate.ps1
py scripts/run_migrations.py
```

Verificá:

```bash
curl http://127.0.0.1:8000/api/health/db-schema
```

Todos los valores deben ser `true` (incluido `event_types_table`).

Migración manual alternativa:

```bash
psql -h HOST -U USER -d DB -f migrations/002_catalog_types.sql
```

## Correr el servidor

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Docs: http://127.0.0.1:8000/api/docs
- Health: http://127.0.0.1:8000/api/health

## Frontend

```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

## Producción (Docker en VPS)

Guía completa: [deploy/DEPLOY.md](../deploy/DEPLOY.md)

```bash
cp deploy/.env.example .env
# editar .env
docker compose up -d --build
```
