# AGROERP — Estructura del Repositorio (Monorepo)

## Visión general

Monorepo gestionado con **Turborepo** + **pnpm workspaces**.

```
agroerp/
├── .github/
│   └── workflows/              # CI/CD pipelines
├── apps/
│   ├── api/                    # Backend NestJS (Modular Monolith)
│   ├── web/                    # Frontend React (Admin + Field)
│   └── android/                # App Kotlin + Jetpack Compose
├── packages/
│   ├── shared/                 # Tipos, constantes, utilidades compartidas
│   ├── api-contract/           # OpenAPI spec + clientes generados
│   ├── event-types/            # Definiciones de eventos del dominio
│   └── ui/                     # Componentes UI compartidos (web)
├── modules/                    # Plugins de negocio (futuro)
│   ├── producers/              # (vacío — Fase 2)
│   ├── farms/
│   └── inventory/
├── infra/
│   ├── docker/                 # Dockerfiles
│   ├── docker-compose.yml      # Dev environment
│   ├── k8s/                    # Kubernetes manifests (prod)
│   └── terraform/              # IaC (futuro)
├── docs/                       # Documentación de arquitectura
├── scripts/                    # Scripts de desarrollo
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## Backend (`apps/api/`)

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── core/                           # ═══ NÚCLEO DE LA PLATAFORMA ═══
│   │   ├── identity/
│   │   │   ├── domain/
│   │   │   │   ├── entities/user.entity.ts
│   │   │   │   ├── repositories/user.repository.ts
│   │   │   │   └── events/user-logged-in.event.ts
│   │   │   ├── application/
│   │   │   │   ├── commands/login.command.ts
│   │   │   │   └── handlers/login.handler.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── persistence/prisma-user.repository.ts
│   │   │   └── presentation/
│   │   │       └── auth.controller.ts
│   │   │
│   │   ├── tenancy/
│   │   │   ├── domain/entities/organization.entity.ts
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   │
│   │   ├── access-control/
│   │   │   ├── domain/             # Role, Permission, Policy
│   │   │   ├── application/        # RBAC + PBAC evaluators
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   │
│   │   ├── resource-engine/
│   │   │   ├── domain/             # Resource entity, ResourceSchema
│   │   │   ├── application/      # CRUD commands/queries
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   │
│   │   ├── metadata/
│   │   │   ├── domain/             # Schema validation, catalogs
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   │
│   │   ├── forms/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── presentation/
│   │   │
│   │   ├── workflows/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── presentation/
│   │   │
│   │   ├── files/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/     # S3 adapter
│   │   │
│   │   ├── gis/
│   │   │   ├── domain/             # Location, geofencing
│   │   │   ├── application/
│   │   │   └── infrastructure/     # PostGIS queries
│   │   │
│   │   ├── events/
│   │   │   ├── domain/             # DomainEvent, EventStore port
│   │   │   ├── application/        # Event handlers registry
│   │   │   └── infrastructure/
│   │   │       ├── postgres-event-store.ts
│   │   │       └── redis-event-bus.ts
│   │   │
│   │   ├── audit/
│   │   │   ├── domain/
│   │   │   ├── application/        # Audit projector
│   │   │   └── infrastructure/
│   │   │
│   │   ├── sync/
│   │   │   ├── domain/
│   │   │   ├── application/        # Push/Pull/Resolve handlers
│   │   │   └── presentation/
│   │   │       └── sync.controller.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/     # FCM adapter (futuro)
│   │   │
│   │   └── platform/
│   │       ├── module-registry.ts  # Plugin system
│   │       ├── module-loader.ts
│   │       └── health.controller.ts
│   │
│   ├── shared/                     # Cross-cutting
│   │   ├── domain/
│   │   │   ├── base.entity.ts
│   │   │   ├── value-objects/      # Uuid, Email, etc.
│   │   │   └── exceptions/
│   │   ├── infrastructure/
│   │   │   ├── database/prisma.service.ts
│   │   │   ├── middleware/tenant.middleware.ts
│   │   │   ├── guards/             # Auth, RBAC, PBAC guards
│   │   │   └── interceptors/
│   │   └── presentation/
│   │       ├── filters/exception.filter.ts
│   │       └── decorators/
│   │
│   └── config/
│       ├── app.config.ts
│       ├── database.config.ts
│       └── auth.config.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── test/
├── openapi/
│   └── agroerp-v1.yaml
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Frontend Web (`apps/web/`)

```
apps/web/
├── src/
│   ├── app/                        # Router, providers
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   └── providers/
│   │       ├── AuthProvider.tsx
│   │       ├── TenantProvider.tsx
│   │       └── QueryProvider.tsx
│   │
│   ├── features/                   # Feature-based modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/LoginPage.tsx
│   │   ├── resources/
│   │   │   ├── components/ResourceList.tsx
│   │   │   ├── components/ResourceForm.tsx  # Dynamic form renderer
│   │   │   └── hooks/useResources.ts
│   │   ├── forms/
│   │   │   ├── components/FormBuilder.tsx
│   │   │   └── components/FormRenderer.tsx
│   │   ├── workflows/
│   │   ├── maps/                   # MapLibre integration
│   │   │   ├── components/MapView.tsx
│   │   │   └── components/GeoEditor.tsx
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   └── settings/
│   │   └── dashboard/
│   │
│   ├── shared/
│   │   ├── api/                    # Generated API client
│   │   ├── components/             # Design system
│   │   ├── hooks/
│   │   └── utils/
│   │
│   └── assets/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Android (`apps/android/`)

```
apps/android/
├── app/
│   └── src/main/
│       ├── java/com/agroerp/
│       │   ├── AgroErpApplication.kt
│       │   │
│       │   ├── core/
│       │   │   ├── di/                 # Hilt modules
│       │   │   ├── network/            # Retrofit + interceptors
│       │   │   ├── database/           # Room database
│       │   │   │   ├── AgroErpDatabase.kt
│       │   │   │   ├── entities/
│       │   │   │   └── daos/
│       │   │   └── security/           # Keystore, cert pinning
│       │   │
│       │   ├── sync/
│       │   │   ├── SyncEngine.kt
│       │   │   ├── SyncWorker.kt       # WorkManager
│       │   │   ├── OutboxManager.kt
│       │   │   ├── ConflictResolver.kt
│       │   │   └── FileUploadQueue.kt
│       │   │
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   │   ├── ui/LoginScreen.kt
│       │   │   │   └── data/AuthRepository.kt
│       │   │   ├── forms/
│       │   │   │   ├── ui/FormCaptureScreen.kt
│       │   │   │   ├── ui/DynamicFieldRenderer.kt
│       │   │   │   └── data/FormRepository.kt
│       │   │   ├── maps/
│       │   │   │   ├── ui/MapScreen.kt
│       │   │   │   └── gps/GpsTracker.kt
│       │   │   ├── resources/
│       │   │   │   └── data/ResourceRepository.kt
│       │   │   └── sync/
│       │   │       └── ui/SyncStatusScreen.kt
│       │   │
│       │   └── ui/
│       │       ├── theme/
│       │       └── navigation/
│       │
│       └── res/
├── build.gradle.kts
└── settings.gradle.kts
```

---

## Packages compartidos

### `packages/shared/`
```typescript
// Tipos compartidos entre backend, web y generación de API
export interface Resource { ... }
export interface DomainEvent { ... }
export const EVENT_TYPES = { ... } as const;
```

### `packages/api-contract/`
```
api-contract/
├── openapi/
│   └── agroerp-v1.yaml         # Fuente de verdad API
├── generated/
│   ├── typescript/             # Cliente para web
│   └── kotlin/                 # Cliente para Android (futuro)
└── package.json
```

### `packages/event-types/`
```typescript
export class ResourceCreatedEvent { ... }
export class FormSubmittedEvent { ... }
// Tipos de eventos compartidos
```

---

## Infraestructura local (`infra/`)

```yaml
# docker-compose.yml (desarrollo)
services:
  postgres:
    image: postgis/postgis:16-3.4
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]

  api:
    build: ../apps/api
    ports: ["3000:3000"]
    depends_on: [postgres, redis, minio]

  web:
    build: ../apps/web
    ports: ["5173:5173"]
```

---

## Convenciones

| Aspecto | Convención |
|---------|------------|
| Branches | `main`, `develop`, `feature/*`, `fix/*` |
| Commits | Conventional Commits (`feat:`, `fix:`, `docs:`) |
| API versioning | `/api/v1/...` |
| Event naming | PascalCase (`ResourceCreated`) |
| DB naming | snake_case |
| TypeScript | strict mode, ESLint + Prettier |
| Testing | Jest (backend), Vitest (web), JUnit (Android) |
