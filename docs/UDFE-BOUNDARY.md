# UDFE — Frontera Arquitectónica Interna

Documento de referencia para la evolución del módulo **UDFE** (Universal Dynamic Form Engine) hacia un futuro **Capture Engine** independiente.

**Estado:** Desacoplamiento interno del backend completado (Sprint 1 + Sprint 2).

---

## 1. Arquitectura anterior

Antes de los sprints de frontera, el módulo `backend/src/core/forms/` tenía dos capas:

```
forms/
├── presentation/     Controllers + DTOs
└── application/      Services + engines
```

Todos los servicios accedían **directamente** a `PrismaService`:

```
Controller → Service → PrismaService → PostgreSQL
```

**Problemas:**

- Lógica de negocio mezclada con queries Prisma.
- Acoplamiento fuerte al ORM en la capa de aplicación.
- Imposibilidad de sustituir persistencia sin tocar servicios.
- Dificultad para extraer el dominio como servicio independiente.

---

## 2. Arquitectura final del backend

El módulo sigue **Domain-Driven Design** y **Hexagonal Architecture**:

```
forms/
├── presentation/           Controllers, DTOs
├── application/            Casos de uso, engines (SIN PrismaService)
├── domain/
│   ├── types/              Entidades y value objects
│   ├── interfaces/         Contratos de repositorio + tokens DI
│   └── events/             Contratos de eventos (sin implementación)
└── infrastructure/
    └── persistence/        Implementaciones Prisma (único acceso ORM)
```

### Flujo de dependencias

```
Controller
    ↓
Application Service
    ↓
Repository Interface (domain)
    ↓
Prisma Repository (infrastructure)
    ↓
PrismaService → PostgreSQL
```

### Regla de dependencia

| Capa | Puede importar |
|------|----------------|
| `presentation` | `application`, DTOs |
| `application` | `domain/interfaces`, `domain/types`, engines, `CoreEngineService` |
| `domain` | Solo tipos propios (sin Prisma, sin NestJS) |
| `infrastructure` | `domain/interfaces`, `PrismaService` |

**Regla estricta:** Ningún archivo en `forms/application/` importa `PrismaService`.

---

## 3. Servicios desacoplados (completos)

| Servicio | Repositorio(s) |
|----------|----------------|
| `FormsService` | `FormRepository` |
| `FormTemplatesService` | `FormTemplateRepository` |
| `FormSubmissionsService` | `FormSubmissionRepository` |
| `FormCampaignsService` | `FormCampaignRepository`, `FormSubmissionRepository` |
| `FormAssignmentsService` | `FormAssignmentRepository` |
| `FormLifecycleService` | `FormLifecycleRepository` |
| `FormDashboardService` | `FormDashboardRepository` |
| `UdfeReportsService` | `FormReportRepository` |
| `FormImportService` | `FormImportRepository` |

### Engines sin persistencia (no requieren repositorio)

| Componente | Rol |
|------------|-----|
| `FormValidationEngine` | Validación runtime de campos |
| `ConditionalLogicEngine` | Reglas visibleWhen / requiredWhen |
| `CalculatedFieldEngine` | Campos calculados |
| `FormRendererService` | Render backend con lógica condicional |

---

## 4. Contratos de repositorio

Ubicación: `forms/domain/interfaces/`

| Interfaz | Token | Implementación Prisma |
|----------|-------|---------------------|
| `FormRepository` | `FORM_REPOSITORY` | `PrismaFormRepository` |
| `FormTemplateRepository` | `FORM_TEMPLATE_REPOSITORY` | `PrismaFormTemplateRepository` |
| `FormSubmissionRepository` | `FORM_SUBMISSION_REPOSITORY` | `PrismaFormSubmissionRepository` |
| `FormCampaignRepository` | `FORM_CAMPAIGN_REPOSITORY` | `PrismaFormCampaignRepository` |
| `FormAssignmentRepository` | `FORM_ASSIGNMENT_REPOSITORY` | `PrismaFormAssignmentRepository` |
| `FormLifecycleRepository` | `FORM_LIFECYCLE_REPOSITORY` | `PrismaFormLifecycleRepository` |
| `FormDashboardRepository` | `FORM_DASHBOARD_REPOSITORY` | `PrismaFormDashboardRepository` |
| `FormReportRepository` | `FORM_REPORT_REPOSITORY` | `PrismaFormReportRepository` |
| `FormImportRepository` | `FORM_IMPORT_REPOSITORY` | `PrismaFormImportRepository` |

Registro en `forms.module.ts`:

```typescript
{ provide: FORM_REPOSITORY, useClass: PrismaFormRepository }
```

---

## 5. Contratos de eventos (preparación futura)

Ubicación: `forms/domain/events/`

Contratos definidos **sin implementación** — el sistema de eventos se implementará en un sprint posterior:

| Contrato | Propósito |
|----------|-----------|
| `FormSubmittedEvent` | Envío capturado (web/Android) |
| `FormPublishedEvent` | Formulario publicado |
| `FormAssignedEvent` | Asignación a usuario/rol |

Hoy los servicios siguen emitiendo eventos vía `CoreEngineService` del ERP. En la extracción, estos contratos serán el puente hacia un bus de eventos del Capture Engine.

---

## 6. Servicios pendientes

**Ninguno en la capa de aplicación.** Todos los servicios del módulo forms están desacoplados de Prisma.

| Área | Pendiente | Sprint futuro |
|------|-----------|---------------|
| Event bus propio | Implementar `ICaptureEventBus` usando contratos en `domain/events/` | Fase 3 |
| CoreEngine | Port/adapters para desacoplar de `CoreEngineService` ERP | Fase 3 |
| Resource creation | Port `ISubmissionResourcePublisher` para `Resource` ERP | Fase 3 |
| Schema DB | PostgreSQL schema `capture` separado | Fase 4 |
| Despliegue | Microservicio NestJS independiente | Fase 5 |

---

## 7. Dependencias eliminadas

En **todos** los servicios de aplicación se eliminó:

```typescript
// ANTES
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
constructor(private readonly prisma: PrismaService) {}
```

```typescript
// DESPUÉS
import { FORM_REPOSITORY, type FormRepository } from '../domain/interfaces';
constructor(@Inject(FORM_REPOSITORY) private readonly formRepository: FormRepository) {}
```

**Sin cambios funcionales:**

- Endpoints HTTP (43 rutas)
- DTOs, permisos, respuestas JSON
- Frontend, Android, otros módulos ERP
- Eventos vía `CoreEngineService`

---

## 8. Preparación para Capture Engine

### 8.1 Sustitución de persistencia

1. Implementar los 9 repositorios contra el nuevo datastore.
2. Registrar en el módulo Capture Engine.
3. Los servicios de aplicación **no requieren cambios**.

### 8.2 Extracción de paquetes

| Paquete futuro | Contenido |
|----------------|-----------|
| `@agroerp/capture-domain` | `domain/types`, `domain/interfaces`, `domain/events` |
| `@agroerp/capture-application` | `application/*` (servicios + engines) |
| `capture-engine` (servicio) | `presentation`, `infrastructure` |

### 8.3 API estable

Controllers y DTOs actúan como **anti-corruption layer**. Opciones de extracción:

- **Opción A:** Proxy HTTP en monolito ERP → Capture Engine
- **Opción B:** Mover controllers al nuevo servicio; nginx enruta `/api/v1/forms*` y `/api/v1/udfe*`

### 8.4 Roadmap restante

| Fase | Acción |
|------|--------|
| Fase 3 | Ports para `CoreEngine` y `Resource` publisher |
| Fase 4 | Schema PostgreSQL `capture` + migrations |
| Fase 5 | Servicio NestJS desplegable |
| Fase 6 | UI `@agroerp/capture-ui` + Android standalone |
| Fase 7 | Deprecar `FormsModule` embebido en ERP |

---

## 9. Estructura de archivos

```
forms/
├── presentation/
│   ├── forms.controller.ts
│   ├── udfe.controller.ts
│   └── forms.dto.ts
├── application/
│   ├── forms.service.ts
│   ├── form-submissions.service.ts
│   ├── form-lifecycle.service.ts
│   ├── form-templates.service.ts
│   ├── form-assignments.service.ts
│   ├── form-campaigns.service.ts
│   ├── form-dashboard.service.ts
│   ├── udfe-reports.service.ts
│   ├── form-import.service.ts
│   └── *engine*.ts
├── domain/
│   ├── types/form.types.ts
│   ├── interfaces/          (9 repositorios + tokens)
│   └── events/index.ts      (3 contratos)
├── infrastructure/
│   └── persistence/         (9 implementaciones Prisma)
└── forms.module.ts
```

---

## 10. Verificación

```bash
cd backend && pnpm build
cd backend && NODE_OPTIONS=--max-old-space-size=4096 pnpm exec jest \
  src/core/forms/application/form-validation.engine.spec.ts \
  src/core/forms/application/form-lifecycle.service.spec.ts --runInBand
```

Endpoints críticos (mismo contrato):

- `GET /api/v1/forms`
- `POST /api/v1/forms`
- `POST /api/v1/forms/:id/publish`
- `POST /api/v1/forms/:id/submit`
- `POST /api/v1/form-submissions/sync`

---

*Última actualización: Sprint 2 — desacoplamiento completo de la capa de aplicación.*
