# Despliegue WowEd en VPS con Docker

Arquitectura recomendada:

```
Internet → :80 (contenedor web / nginx)
              ├── /        → Vue (estáticos)
              └── /api/    → FastAPI (contenedor api)
                                    └── PostgreSQL (ya en el host, puerto 5432)
```

No incluimos Postgres en Docker porque ya lo tenés en el VPS.

## Requisitos en el VPS

- Docker Engine + Docker Compose v2 (`docker compose`)
- Git (o subís el código por SFTP)
- PostgreSQL accesible (migraciones en `backend/migrations/`, se aplican al arrancar el contenedor `api`)
- Puertos: `80` (y `443` si más adelante agregás HTTPS)

## 1. Subir el código al servidor

```bash
ssh usuario@TU_VPS
sudo mkdir -p /opt/wowed
sudo chown $USER:$USER /opt/wowed
cd /opt/wowed
git clone https://github.com/Sevenkowen/WowEd.git .
# Estructura esperada: frontend/, backend/, deploy/, docker-compose.yml
```

Si el remoto quedó mal (ej. `TU_USUARIO/TU_REPO`):

```bash
cd /opt/wowed
git remote set-url origin https://github.com/Sevenkowen/WowEd.git
git remote -v
git pull origin main
```

GitHub **no acepta la contraseña de la cuenta** en `git pull`. Usá un [Personal Access Token](https://github.com/settings/tokens) (scope `repo`) como contraseña, o configurá SSH (`git@github.com:Sevenkowen/WowEd.git`).

## 2. Variables de entorno

```bash
cp deploy/.env.example .env
nano .env
```

Ejemplo si Postgres escucha en **localhost** del VPS:

```env
DATABASE_URL=postgresql+psycopg://ajenjo:TU_PASSWORD@host.docker.internal:5432/postgres
SECRET_KEY=un-secreto-largo-unico
CORS_ORIGINS=http://45.236.130.10
HTTP_PORT=80
```

`CORS_ORIGINS` debe coincidir con la URL que usa el navegador (dominio o IP).

## 3. Build y arranque

```bash
cd /opt/wowed
docker compose up -d --build
docker compose ps
docker compose logs -f api
```

Probar:

- App: `http://IP_DEL_VPS/`
- API: `http://IP_DEL_VPS/api/health`
- Docs: `http://IP_DEL_VPS/api/docs` (si querés, luego restringís esto en nginx)

## 4. Actualizar después de cambios

```bash
cd /opt/wowed
bash deploy/remote-deploy.sh
```

O manualmente:

```bash
cd /opt/wowed
git pull
docker compose up -d --build
```

Las migraciones SQL (`backend/migrations/*.sql`) se ejecutan automáticamente al iniciar el contenedor `api`.

Verificá el esquema:

```bash
curl http://IP_DEL_VPS/api/health/db-schema
```

Todos los flags deben ser `true`.

Solo backend:

```bash
docker compose up -d --build api
```

Solo frontend:

```bash
docker compose up -d --build web
```

## 5. HTTPS (recomendado)

Opciones habituales:

1. **Caddy** o **nginx** en el host como reverse proxy + Let's Encrypt.
2. **Traefik** delante de `docker compose` con labels.
3. Certbot en el host apuntando al puerto 80 del contenedor `web`.

Cuando tengas dominio, actualizá `CORS_ORIGINS=https://tudominio.com` y reconstruí `api`.

## 6. Firewall

```bash
# Ejemplo UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

No expongas el puerto `5432` a internet si no es necesario.

## 7. PostgreSQL en el host

Desde el contenedor `api`, la DB debe ser alcanzable vía `host.docker.internal`.

En el host, verificá que Postgres escuche y acepte conexiones:

```bash
sudo ss -tlnp | grep 5432
```

Si solo escucha `127.0.0.1`, `host.docker.internal` es la opción correcta.

Si `pg_hba.conf` no permite la red Docker, podés añadir una línea para la subred bridge (ej. `172.16.0.0/12`) o usar la IP del bridge en `DATABASE_URL`.

## 8. Solución de problemas

| Síntoma | Qué revisar |
|--------|-------------|
| `api` unhealthy | `docker compose logs api` — URL de DB, credenciales |
| Front carga pero calendario vacío | `.env` del build usa `VITE_USE_API=true`; revisar Network en el navegador |
| CORS en consola | `CORS_ORIGINS` debe incluir la URL exacta del sitio |
| Puerto 80 ocupado | En `.env` poné `HTTP_PORT=8080` y usá proxy o abrí 8080 |
| Build web: `binding-linux-x64-musl` | El `frontend/Dockerfile` debe usar `node:22-bookworm-slim` (no Alpine). Rebuild sin caché: `docker-compose build --no-cache web` |

## 9. Seguridad

- No commitear `.env` con contraseñas.
- Rotar password de Postgres si se filtró.
- En producción, limitar `/api/docs` o desactivar OpenAPI si no lo necesitás.
