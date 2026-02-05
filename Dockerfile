# syntax=docker/dockerfile:1.6

############################################
# BASE: Node + pnpm (через corepack)
############################################
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

############################################
# DEPS: устанавливаем зависимости workspace
############################################
FROM base AS deps

# Сначала — только файлы, влияющие на зависимости (для кеша)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# package.json пакетов (важно для pnpm workspace)
COPY backend/package.json backend/package.json
COPY frontend/tg-miniapp/package.json frontend/tg-miniapp/package.json

# Установка зависимостей
RUN pnpm install --frozen-lockfile

############################################
# BACKEND BUILD: собираем Nest (proj1)
############################################
FROM deps AS backend-build
COPY backend ./backend
RUN pnpm --filter proj1 build

############################################
# BACKEND PROD: рантайм Nest (node dist/main)
############################################
FROM node:20-alpine AS backend-prod
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production

# В проде можно ставить только prod deps,
# но раз у тебя workspace, проще/надёжнее перенести node_modules целиком.
# Оптимизацию сделаем потом, когда всё заработает стабильно.
COPY --from=deps /app/node_modules ./node_modules

# Переносим собранный backend
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/package.json ./backend/package.json

EXPOSE 3000
CMD ["node", "backend/dist/main"]

############################################
# FRONTEND BUILD: Vite build (tg-miniapp)
############################################
FROM deps AS frontend-build
COPY frontend/tg-miniapp ./frontend/tg-miniapp
RUN pnpm --filter tg-miniapp build

############################################
# FRONTEND PROD: nginx раздаёт статику
############################################
FROM nginx:alpine AS frontend-prod
COPY --from=frontend-build /app/frontend/tg-miniapp/dist /usr/share/nginx/html
EXPOSE 80
