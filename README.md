# AGROERP — Agro Enterprise Platform

Plataforma agroindustrial modular, offline-first, multi-tenant y extensible.

## Quick Start

```bash
cp .env.example .env
pnpm setup          # instala deps + compila shared + genera Prisma
pnpm docker:up
curl http://localhost:3080/api/v1/health
```

**Demo credentials:** `admin@demo.agroerp.com` / `Admin123!`

Ver [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) para guía completa.

Antes de pruebas funcionales: `pnpm preflight`

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | NestJS + TypeScript + Prisma |
| Database | PostgreSQL 16 + PostGIS |
| Cache/Events | Redis Streams |
| Storage | MinIO (S3-compatible) |
| Frontend | React 19 + Vite |
| Mobile | Kotlin + Room (offline-first) |

## Estructura

```
agroerp/
├── backend/          # API NestJS (Clean Architecture)
├── frontend/         # React web base
├── mobile-android/   # Kotlin offline-first (estructura)
├── shared/           # Tipos compartidos
├── infra/            # Docker Compose
└── docs/             # Arquitectura y guías
```

## API

- **Base URL:** `http://localhost:3080/api/v1`
- **Swagger:** `http://localhost:3080/docs`
- **Health:** `GET /api/v1/health`

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Base de datos](docs/DATABASE.md)
- [Eventos](docs/EVENTS.md)
- [Sincronización offline](docs/SYNC.md)
- [Inicio rápido](docs/GETTING_STARTED.md)

## Estado

**v0.1.0 — Starter Kit Técnico**
- Auth JWT + RBAC
- Multi-tenant (Organization)
- Resource Engine genérico
- Event Store + Event Bus
- Audit Log automático
- Docker Compose funcional
