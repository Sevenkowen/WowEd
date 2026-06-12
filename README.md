# WowEd

Plataforma educativa: calendario escolar, planificación y gestión institucional.

## Estructura del repositorio

```text
WowEd/
├── frontend/     # Vue 3 + Vite + TypeScript
├── backend/      # API FastAPI + PostgreSQL
├── deploy/       # Docker, nginx, guía de despliegue
└── docker-compose.yml
```

## Desarrollo local

### API

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # DATABASE_URL, SECRET_KEY
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env          # VITE_API_URL, VITE_USE_API
npm run dev
```

App: http://localhost:5173 — API: http://127.0.0.1:8000/api/docs

## Producción (Docker)

Ver [deploy/DEPLOY.md](deploy/DEPLOY.md).

```bash
cp deploy/.env.example .env
docker compose up -d --build
```
