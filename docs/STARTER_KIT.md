# AGROERP — Starter Kit Técnico v0.1.0

## Qué incluye este entregable

Starter kit funcional con infraestructura base lista para desarrollo en equipo.

### Backend (NestJS + Clean Architecture)

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| **Identity** | ✅ | Auth login/register/me, JWT, Users CRUD |
| **Tenancy** | ✅ | Organization multi-tenant, middleware de aislamiento |
| **Access Control** | ✅ | RBAC: Roles, Permissions, Guards |
| **Resource Engine** | ✅ | Entidad genérica Resource CRUD + eventos |
| **Events** | ✅ | Event Store (PostgreSQL) + Event Bus (Redis/in-memory) |
| **Audit** | ✅ | Proyección automática a audit_logs |
| **Platform** | ✅ | Health check, Swagger docs |

### Infraestructura

| Componente | Estado |
|------------|--------|
| PostgreSQL + PostGIS | ✅ Docker |
| Redis | ✅ Docker |
| MinIO (S3) | ✅ Docker |
| Docker Compose | ✅ |
| Prisma ORM + Seed | ✅ |

### Frontend

| Componente | Estado |
|------------|--------|
| React 19 + Vite | ✅ Base mínima con health check |

### Mobile Android

| Componente | Estado |
|------------|--------|
| Estructura Kotlin | ✅ Sin UI |
| API Client (Retrofit) | ✅ Contratos definidos |
| Room entities | ✅ Sync outbox + resources |
| SyncEngine | ✅ Esqueleto |

## Arquitectura implementada

```
backend/src/
├── shared/                    # Cross-cutting
│   ├── domain/                # BaseEntity, Event ports
│   ├── infrastructure/        # Prisma, Guards, Middleware
│   └── presentation/          # Decorators
├── core/
│   ├── identity/              # Auth + Users (hexagonal)
│   ├── events/                # Event Store + Bus
│   ├── resource-engine/       # Generic Resource CRUD
│   └── platform/              # Health
```

**Patrón por módulo:**
- `domain/` — entidades, ports (interfaces)
- `application/` — servicios, DTOs, casos de uso
- `infrastructure/` — adaptadores (Prisma, Redis, JWT)
- `presentation/` — controllers REST

## Eventos implementados

| Evento | Trigger |
|--------|---------|
| `UserCreated` | Register / Create user |
| `AuthLoggedIn` | Login exitoso |
| `ResourceCreated` | POST /resources |
| `ResourceUpdated` | PATCH /resources/:id |
| `ResourceDeleted` | DELETE /resources/:id |

Todos generan entrada en `events` + `audit_logs`.

## Decisiones técnicas (ADRs)

| Decisión | Elección | Razón |
|----------|----------|-------|
| Event Bus MVP | Redis Streams + fallback in-memory | Sin Kafka en MVP; migración futura |
| ORM | Prisma | Type-safety, migraciones, DX |
| Auth | JWT propio | OAuth2 preparado para Fase 2 |
| Path aliases | `@/` en source | Resueltos por NestJS tsc |
| IDs | UUID v4 (Prisma) | Compatible out-of-the-box; v7 en Fase 2 |

## Cómo arrancar

```bash
# Opción A: Solo infra Docker + backend local
docker compose -f infra/docker-compose.yml up postgres redis minio -d
cp .env.example .env
pnpm install
pnpm --filter @agroerp/shared build
cd backend && cp ../.env .env
pnpm db:generate && pnpm exec prisma db push && pnpm db:seed
pnpm dev

# Opción B: Todo en Docker
pnpm docker:up
```

## Verificación

```bash
curl http://localhost:3010/api/v1/health
# → {"status":"healthy",...}

curl -X POST http://localhost:3010/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.agroerp.com","password":"Admin123!"}'
# → {"accessToken":"...",...}
```

## Próxima fase

1. Sync API (`/sync/pull`, `/sync/push`)
2. Forms module (dynamic forms)
3. GIS module (Location + PostGIS)
4. Files module (MinIO upload)
5. Plugin registry
6. Android UI + sync completo
