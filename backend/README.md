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

## Migración para tareas en calendario

La tabla `tasks` en el VPS no trae fecha/hora de calendario. Ejecutá **una vez**:

```bash
psql -h 45.236.130.10 -U ajenjo -d postgres -f migrations/001_task_calendar_fields.sql
```

Verificá:

```bash
curl http://127.0.0.1:8000/api/health/db-schema
```

## Correr el servidor

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Docs: http://127.0.0.1:8000/docs
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
