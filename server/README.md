# AppSamurai Backend

Fastify + Prisma backend for multi-user CSV ingest and dashboard data.

## Setup

1. Create `.env` in `server/` with:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
PORT=8787
```

2. Install deps and generate client

```
pnpm i
pnpm -C server i
pnpm -C server prisma:generate
pnpm -C server prisma:migrate --name init
pnpm -C server dev
```

## Endpoints (initial)
- GET /health
- GET /files
- POST /files/init
- GET /files/:id/settings
- PATCH /files/:id/settings
- DELETE /files/:id

Ingest endpoint and storage integration will be added next.


