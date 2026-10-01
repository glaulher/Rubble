# Multi-stage Dockerfile:
# 1. Build do Frontend React (Vite)
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package.json pnpm-lock.yaml* bun.lockb* ./
RUN npm install

COPY . .
RUN npm run build

# 2. Runtime PocketBase + arquivos estáticos do React
FROM alpine:3.20

ARG PB_VERSION=0.22.20

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    curl \
    tzdata

# Download PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip && \
    chmod +x /pb/pocketbase

WORKDIR /pb

# Copia migrações e hooks do PocketBase
COPY pocketbase/migrations /pb/pb_migrations
COPY pocketbase/hooks /pb/pb_hooks

# Copia build estática do React para servir direto pelo PocketBase
COPY --from=frontend-builder /app/dist /pb/pb_public

EXPOSE 8090

VOLUME ["/pb/pb_data"]

# Inicia PocketBase servindo APIs e frontend estático
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--publicDir=/pb/pb_public"]
