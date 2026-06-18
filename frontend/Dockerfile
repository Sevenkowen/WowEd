# Build Vue — contexto docker compose = raíz del repo (.)
# NO usar node:*-alpine: Vite 8 / Rolldown necesita glibc (@rolldown/binding-linux-x64-gnu)
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY frontend/package.json frontend/package-lock.json ./

# Un solo RUN: evita caché de capas con node_modules de otra imagen base (Alpine/musl)
RUN npm ci --include=optional \
    && npm install @rolldown/binding-linux-x64-gnu@1.0.0-rc.17 --no-save \
    && node -e "require('@rolldown/binding-linux-x64-gnu')"

COPY frontend/index.html frontend/vite.config.ts \
     frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json ./
COPY frontend/public ./public
COPY frontend/src ./src

ARG VITE_API_URL=/api
ARG VITE_USE_API=true
ARG VITE_INSTITUTION_ID=00000000-0000-0000-0000-000000000001
ENV VITE_API_URL=$VITE_API_URL \
    VITE_USE_API=$VITE_USE_API \
    VITE_INSTITUTION_ID=$VITE_INSTITUTION_ID

RUN npm run build

FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
