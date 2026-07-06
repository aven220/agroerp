# AGROERP — Guía de Inicio Rápido

## Requisitos

- Node.js 20+
- **pnpm 9+** (obligatorio — este monorepo no usa npm)
- Docker & Docker Compose
- (Opcional) Android Studio para mobile

> **Importante:** Usa `pnpm`, no `npm`. Comandos como `pnpm --filter @agroerp/shared build` no funcionan con npm.

## Arranque con un solo comando

```bash
# 1. Clonar e instalar dependencias
cd agroerp
cp .env.example .env
pnpm setup

# 2. Levantar infraestructura + backend
pnpm docker:up

# 3. Verificar
curl http://localhost:3080/api/v1/health
```

## Desarrollo local (2 terminales)

**Terminal 1 — Backend** (debe estar corriendo primero):

```bash
cd agroerp
pnpm dev
```

Debes ver: `AGROERP API running on http://localhost:3080/api/v1`

Si sale `EADDRINUSE`, libera el puerto y reintenta:

```bash
pnpm port:free
pnpm dev
```

**Terminal 2 — Frontend:**

```bash
cd agroerp
pnpm dev:frontend
```

Abre **http://localhost:5173** (no uses el puerto 9001 — ese es MinIO).

## Pre-flight (antes de QA)

```bash
pnpm preflight   # Docker, .env, PostgreSQL, backend health
pnpm health      # curl /api/v1/health
```

> El frontend hace proxy a `localhost:3080`. Si el backend no está arriba, verás `ECONNREFUSED` en Vite.

## Desarrollo local (infra + backend manual)

```bash
# Terminal 1: Infraestructura
docker compose -f infra/docker-compose.yml up postgres redis minio -d

# Terminal 2: Backend
cp .env.example .env
pnpm setup
cd backend
cp ../.env .env
pnpm db:generate
pnpm exec prisma db push
pnpm db:seed
pnpm dev

# Terminal 3: Frontend (opcional)
pnpm dev:frontend
```

## Credenciales demo

| Campo | Valor |
|-------|-------|
| Email | `admin@demo.agroerp.com` |
| Password | `Admin123!` |
| Organización | `demo-agro` |

## Endpoints principales

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/v1/health` | No | Health check |
| POST | `/api/v1/auth/register` | No | Registrar org + admin |
| POST | `/api/v1/auth/login` | No | Login |
| GET | `/api/v1/auth/me` | Sí | Perfil actual |
| GET | `/api/v1/users` | Sí | Listar usuarios |
| POST | `/api/v1/users` | Sí | Crear usuario |
| GET | `/api/v1/resources` | Sí | Listar recursos |
| POST | `/api/v1/resources` | Sí | Crear recurso |

## Swagger

http://localhost:3080/docs

## Probar login

```bash
curl -X POST http://localhost:3080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.agroerp.com","password":"Admin123!"}'
```

## Servicios Docker

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Backend API | 3080 | NestJS API |
| PostgreSQL + PostGIS | 5432 | Base de datos |
| Redis | 6379 | Cache + Event Bus |
| MinIO | 9000/9001 | Object storage |
| Frontend | 5173 | React (dev) |

## Estructura del proyecto

```
agroerp/
├── backend/          # NestJS API (Clean Architecture)
├── frontend/         # React web base
├── mobile-android/   # Kotlin offline-first (estructura)
├── shared/           # Tipos y constantes compartidos
├── infra/            # Docker, K8s
└── docs/             # Arquitectura
```

## Próximos pasos

Ver [docs/ARCHITECTURE.md](ARCHITECTURE.md) para la hoja de ruta completa.
