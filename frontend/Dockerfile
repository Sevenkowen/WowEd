# Build Vue — el contexto de docker compose es la raíz del repo (.)
FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/index.html frontend/vite.config.ts \
     frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json ./
COPY frontend/public ./public
COPY frontend/src ./src

ARG VITE_API_URL=/api
ARG VITE_USE_API=true
ENV VITE_API_URL=$VITE_API_URL \
    VITE_USE_API=$VITE_USE_API

RUN npm run build

FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
