# WowEd — Frontend

Vue 3 + Vite + Tailwind 4.

```bash
npm install
cp .env.example .env
npm run dev
```

Variables en `.env`:

- `VITE_API_URL` — en local: `http://127.0.0.1:8000/api`; en Docker build: `/api`
- `VITE_USE_API` — `true` para usar PostgreSQL vía backend
