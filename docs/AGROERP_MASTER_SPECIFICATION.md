# AGROERP — Master Specification

**Documento:** AGROERP MASTER SPECIFICATION  
**Versión:** 1.0  
**Estado:** Oficial — Única fuente de verdad del proyecto  
**Fecha:** 2026-07-02  
**Audiencia:** Desarrolladores, arquitectos, QA, producto, integradores, sistemas de IA  
**Autoridad:** Este documento consolida y gobierna toda la arquitectura aprobada. Los documentos `{MODULE}.md` son especificaciones detalladas de referencia; en caso de conflicto de implementación prevalece `AEPS.md`; en orquestación prevalece `APOS.md`.

---

## Tabla de contenidos

1. [Visión del proyecto](#1-visión-del-proyecto)
2. [Objetivos generales](#2-objetivos-generales)
3. [Objetivos específicos](#3-objetivos-específicos)
4. [Alcance](#4-alcance)
5. [Alcance fuera del proyecto](#5-alcance-fuera-del-proyecto)
6. [Arquitectura general](#6-arquitectura-general)
7. [Principios de diseño](#7-principios-de-diseño)
8. [Principios de desarrollo](#8-principios-de-desarrollo)
9. [Estándares técnicos](#9-estándares-técnicos)
10. [Arquitectura de módulos](#10-arquitectura-de-módulos)
11. [Arquitectura de microservicios](#11-arquitectura-de-microservicios)
12. [Arquitectura móvil](#12-arquitectura-móvil)
13. [Arquitectura web](#13-arquitectura-web)
14. [Arquitectura de datos](#14-arquitectura-de-datos)
15. [Arquitectura GIS](#15-arquitectura-gis)
16. [Arquitectura IA](#16-arquitectura-ia)
17. [Arquitectura Offline](#17-arquitectura-offline)
18. [Arquitectura de sincronización](#18-arquitectura-de-sincronización)
19. [Arquitectura de seguridad](#19-arquitectura-de-seguridad)
20. [Arquitectura documental](#20-arquitectura-documental)
21. [Arquitectura de eventos](#21-arquitectura-de-eventos)
22. [Arquitectura de integración](#22-arquitectura-de-integración)
23. [Arquitectura de plugins](#23-arquitectura-de-plugins)
24. [Arquitectura analítica](#24-arquitectura-analítica)
25. [Arquitectura de simulación](#25-arquitectura-de-simulación)
26. [Catálogo de módulos](#26-catálogo-de-módulos)
27. [Actores y tipos de usuario](#27-actores-y-tipos-de-usuario)
28. [Modelo de entidades](#28-modelo-de-entidades)
29. [Catálogo de procesos](#29-catálogo-de-procesos)
30. [Catálogo de permisos](#30-catálogo-de-permisos)
31. [Flujos del sistema](#31-flujos-del-sistema)
32. [Matriz de dependencias](#32-matriz-de-dependencias)
33. [Nomenclaturas y convenciones](#33-nomenclaturas-y-convenciones)
34. [Patrones de desarrollo](#34-patrones-de-desarrollo)
35. [Políticas](#35-políticas)
36. [Jerarquía documental](#36-jerarquía-documental)
37. [Evolución del documento](#37-evolución-del-documento)

---

## 1. Visión del proyecto

AGROERP es una **plataforma agroindustrial enterprise** diseñada para empresas integradas del café — compradoras, procesadoras y comercializadoras — que operan directamente con productores en territorios rurales con conectividad limitada.

No es un ERP monolítico tradicional. Es un **sistema operativo de plataforma (APOS)** que orquesta motores transversales reutilizables y dominios de negocio extensibles mediante metadata, eventos y plugins.

### Propuesta de valor

| Para quién | Valor |
|------------|-------|
| **Operaciones** | Cadena completa finca → compra → calidad → inventario → despacho → pago con trazabilidad |
| **Campo** | Captura offline-first en Android con sincronización determinista |
| **Gerencia** | KPIs oficiales, command center operativo, analítica gobernada |
| **TI** | Extensibilidad sin modificar core; multi-tenant nativo; auditoría total |
| **Compliance** | Trazabilidad documental, geográfica y financiera auditable |

### Analogías de referencia

| Plataforma | Capacidad análoga en AGROERP |
|------------|------------------------------|
| Salesforce Platform | Metadata-driven + extensiones |
| SAP BTP | Servicios compartidos + dominios |
| ServiceNow | Event-driven + workflows |
| ArcGIS Enterprise | Servicios geoespaciales |
| Palantir Foundry | Datos + decisiones operativas |

---

## 2. Objetivos generales

| # | Objetivo |
|---|----------|
| OG-01 | Digitalizar la operación agroindustrial del café de punta a punta |
| OG-02 | Operar en zonas rurales sin conectividad continua (offline-first) |
| OG-03 | Garantizar trazabilidad desde finca hasta cliente final |
| OG-04 | Ser multi-tenant, multi-país y multi-commodity extensible |
| OG-05 | Permitir evolución del negocio sin redeploy del núcleo |
| OG-06 | Mantener una única fuente de verdad operativa y analítica |
| OG-07 | Cumplir estándares enterprise de seguridad, auditoría y gobierno |

---

## 3. Objetivos específicos

| # | Objetivo | Módulo responsable |
|---|----------|-------------------|
| OE-01 | Golden record del productor con ciclo de vida | PRM |
| OE-02 | Catastro territorial autoritativo con geometrías versionadas | FTIP + GIS |
| OE-03 | Contratos, cupos y campañas comerciales | CSAE |
| OE-04 | Compra en campo y recepción en bodega (34 pasos) | CPE |
| OE-05 | Control de calidad y dictámenes | CQIE |
| OE-06 | Inventario event-sourced con trazabilidad | CITE |
| OE-07 | Liquidación, anticipos y pagos al productor | CSFE |
| OE-08 | Logística, rutas y cadena de custodia | CLSE |
| OE-09 | Asistencia técnica y planes de manejo | AITAP |
| OE-10 | Repositorio documental y multimedia gobernado | EDMKP |
| OE-11 | Coordinación operativa en tiempo real y diferido | OCC |
| OE-12 | 104 catálogos maestros transversales | MDE |
| OE-13 | Gobierno del dato y calidad | DGMP |
| OE-14 | Integración con bancos, IoT, satélite, gobierno | IEL |
| OE-15 | BI, métricas oficiales y Feature Store | DPAL |
| OE-16 | Automatización, predicción y decisiones asistidas | AIADP |
| OE-17 | Extensibilidad mediante plugins certificados | EPF |
| OE-18 | Compliance, riesgo y control financiero | GECL |

---

## 4. Alcance

### 4.1 Incluido

| Capa | Alcance |
|------|---------|
| **Plataforma** | Core Engine, Identity, Events, Resource, Metadata, Forms, Workflows, Audit, Sync, Files |
| **Clientes** | Web ERP Portal, Android Field App, APIs REST para integraciones |
| **Dominio café** | PRM, FTIP, CSAE, CPE, CQIE, CITE, CSFE, CLSE, AITAP |
| **Transversal** | MDE, DGMP, EDMKP, OCC, GIS, EPF, GECL, IEL, DPAL, AIADP |
| **Infraestructura** | PostgreSQL+PostGIS, Redis, MinIO, Docker Compose (dev); K8s (prod futuro) |
| **País inicial** | Colombia (configurable multi-país) |
| **Commodity inicial** | Café (arquitectura extensible a cacao, palma, etc.) |

### 4.2 Fases de entrega

| Release | Contenido |
|---------|-----------|
| R0 Foundation | Plataforma core + Web Portal operativo |
| R1 Master & Territory | MDE, DGMP, PRM, FTIP, GIS |
| R2 Commercial Chain | CSAE, CPE, CQIE, CITE |
| R3 Settlement & Logistics | CSFE, CLSE |
| R4 Field Operations | AITAP, Android GA, OCC, EDMKP completo |
| R5 Enterprise | EPF, GECL, IEL, DPAL, AIADP |

---

## 5. Alcance fuera del proyecto

| Exclusión | Notas |
|-----------|-------|
| Portal productor B2C completo | Futuro; PRM soporta perfil externo |
| Tostión y retail | Fuera del CDP v2.0 |
| ERP contable general completo | Integración vía IEL; CSFE cubre productor |
| MDM de dispositivos corporativos | OCC monitorea sync, no MDM |
| ITSM genérico | OCC gestiona incidentes operativos, no tickets IT |
| Implementación UI detallada | Fuera de esta especificación |
| Código fuente | Fuera de esta especificación |
| Infraestructura cloud productiva detallada | APOS define principios; IaC separado |
| Marketplace público de plugins | EPF prepara contrato; storefront futuro |
| Drones y robótica agrícola | Roadmap IEL |
| Blockchain trazabilidad | No requerido; trazabilidad event-sourced |

---

## 6. Arquitectura general

### 6.1 Diagrama de capas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAPA DE CLIENTES                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Web ERP      │  │ Web Field    │  │ Android App  │  │ Integraciones    │ │
│  │ (React)      │  │ (PWA futuro) │  │ (Kotlin)     │  │ (IEL / API)      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
└─────────┼─────────────────┼─────────────────┼──────────────────┼──────────┘
          └─────────────────┴────────┬────────┴──────────────────┘
                                     │ HTTPS /api/v1
┌────────────────────────────────────┼────────────────────────────────────────┐
│                    API GATEWAY / EDGE (APOS)                                │
│  Auth JWT · Tenant · Rate limit · Versioning · OpenAPI · CorrelationId      │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│              MODULAR MONOLITH — NestJS (Clean / Hexagonal)                  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ APOS KERNEL — CoreEngineService · Registries · Config · Health       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────── MOTORES CORE ────────┐  ┌──────── DOMINIOS CAFÉ (plugins) ───┐  │
│  │ Identity · Events · Resource │  │ PRM · FTIP · CSAE · CPE · CQIE     │  │
│  │ Metadata · Forms · Workflow  │  │ CITE · CSFE · CLSE · AITAP        │  │
│  │ Audit · Sync · Files · GIS   │  └────────────────────────────────────┘  │
│  └──────────────────────────────┘                                           │
│                                                                             │
│  ┌──────── CAPAS TRANSVERSALES ──────────────────────────────────────────┐  │
│  │ MDE · DGMP · EDMKP · OCC · EPF · GECL · IEL · DPAL · AIADP           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────── EVENT BUS (Redis Streams) ────────────────────────┐  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                         CAPA DE PERSISTENCIA                                │
│  PostgreSQL+PostGIS │ Redis │ MinIO/S3 │ Event Store (PG particionado)      │
│  DPAL Lake/Warehouse (futuro) │ Elasticsearch búsqueda (futuro)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Modelo conceptual APOS

| Entidad OS | Definición |
|------------|------------|
| **Motor (Engine)** | Capacidad transversal registrada permanentemente en el kernel |
| **Dominio (Domain Plugin)** | Extensión de negocio que consume motores y publica metadata |
| **Recurso (Resource)** | Entidad genérica gobernada por Resource + Metadata Engine |
| **Evento (Event)** | Hecho inmutable que describe cambio de estado |
| **Catálogo (Catalog)** | Registro autoritativo de capacidades de la plataforma |
| **Contexto de ejecución** | Tenant + usuario + dispositivo + correlationId + permisos efectivos |
| **Proyección (Projection)** | Vista derivada de eventos (audit, sync, KPIs, OCC) |

### 6.3 Stack tecnológico oficial

| Capa | Tecnología |
|------|------------|
| Backend | NestJS + TypeScript + Prisma |
| Base de datos OLTP | PostgreSQL 16 + PostGIS |
| Cache / Bus | Redis Streams |
| Object Storage | MinIO (S3-compatible) |
| Web | React 19 + Vite + React Router |
| Mobile | Kotlin + Jetpack Compose + Room |
| Tipos compartidos | `shared/` monorepo package |
| Contenedores dev | Docker Compose |
| API contract | OpenAPI 3.x (Swagger `/docs`) |

---

## 7. Principios de diseño

| # | Principio | Descripción |
|---|-----------|-------------|
| P1 | **Kernel mínimo, extensión máxima** | Negocio en plugins y metadata, no en core |
| P2 | **Eventos como sistema nervioso** | Mutación significativa → evento; motores reaccionan |
| P3 | **Metadata sobre código** | Schemas, forms, workflows configurables sin redeploy |
| P4 | **Multi-tenant nativo** | `organizationId` en datos, eventos, config, observabilidad |
| P5 | **Offline ciudadano de primera clase** | Sync, colas, idempotencia son servicios del OS |
| P6 | **Observable por diseño** | Métricas, trazas, logs, auditoría unificados |
| P7 | **Fail-safe, no fail-open** | Sin registro APOS → sin ejecución; sin permiso → denegado |
| P8 | **Evolución sin ruptura** | Versionado, compatibilidad, migración responsabilidad del OS |
| P9 | **Resource Model primero** | Tablas dedicadas solo con justificación técnica |
| P10 | **Single source of truth por dominio** | PRM=productor, FTIP=geometría, EDMKP=contenido |

---

## 8. Principios de desarrollo

| # | Principio | Fuente |
|---|-----------|--------|
| D1 | Clean / Hexagonal Architecture por módulo | AEPS §1.2 |
| D2 | Toda mutación vía CoreEngineService | CORE_ENGINE |
| D3 | Dominio nunca importa infraestructura | AEPS |
| D4 | OpenAPI First — contrato antes de implementación | ADR-008 |
| D5 | Idempotencia en sync, webhooks, handlers | EVENTS, SYNC |
| D6 | Tests: ≥80% application layer; escenarios críticos integración | AEPS |
| D7 | Sin excepciones silenciosas a AEPS | AEPS R1 |
| D8 | Documentación = contrato oficial | AEPS R2 |
| D9 | Correlation ID en toda cadena | AEPS R8 |
| D10 | Preferir composición por eventos sobre acoplamiento directo | APOS P2 |

### Estructura de código obligatoria

```
backend/src/core/{module}/
├── domain/           # Entidades, ports, reglas — sin frameworks
├── application/      # Casos de uso, DTOs, orquestación
├── infrastructure/   # Prisma, Redis, S3, adaptadores
└── presentation/     # Controllers REST, guards
```

**Regla de dependencia:** `presentation → application → domain ← infrastructure`

---

## 9. Estándares técnicos

### 9.1 Identificadores y datos

| Estándar | Valor |
|----------|-------|
| IDs | UUID v4/v7, tipo `uuid` PostgreSQL |
| Primary Key | Siempre `id` |
| Multi-tenant | `organizationId` NOT NULL en negocio |
| Timestamps | `createdAt`, `updatedAt` en `timestamptz` UTC |
| Soft delete | `deletedAt` nullable — nunca DELETE físico en producción |
| Versionado | `version Int` optimistic locking |
| Atributos dinámicos | `jsonb` validado por Metadata Engine |
| Sync offline | `externalId` opcional único por org |
| Sync status | `synced` \| `pending` \| `conflict` |

### 9.2 Nomenclatura

| Capa | Convención | Ejemplo |
|------|------------|---------|
| Tablas PostgreSQL | snake_case plural | `form_submissions` |
| Columnas | snake_case | `organization_id` |
| Prisma models | PascalCase singular | `FormSubmission` |
| Prisma fields | camelCase + `@map` | `organizationId` |
| Enums | snake_case valores | `field_agent` |
| APIs REST | kebab-case rutas, camelCase JSON | `/api/v1/form-submissions` |
| Permisos | `{resource}:{action}` | `purchase:create` |
| Eventos | PascalCase | `ResourceCreated` |
| Extension packages | reverse DNS | `agro.coffee.procurement` |

### 9.3 API

| Estándar | Valor |
|----------|-------|
| Base URL | `/api/v1` |
| Auth | `Authorization: Bearer {jwt}` |
| Paginación | `?page=1&limit=50` |
| Errores | RFC 7807 Problem Details |
| Versionado | URL path `/v1`; breaking → `/v2` |
| Headers obligatorios móvil | `X-Device-Id`, `X-App-Version`, `X-Platform` |
| Header trazabilidad | `X-Correlation-Id` |

---

---

## 10. Arquitectura de módulos

### 10.1 Taxonomía de componentes

| Tipo | Prefijo API | Registro | Ejemplo |
|------|-------------|----------|---------|
| Motor Core | `/api/v1/{engine}` | `app.module.ts` + APOS Engine Catalog | Identity, Events |
| Módulo negocio | `/api/v1/{domain}` | EPF Extension Package | PRM, CPE |
| Capacidad transversal | Middleware/Guard global | Core Engine | Tenant, Auth |
| Integración | `/api/v1/integrations/{id}` | IEL Integration Catalog | Webhooks, bancos |

### 10.2 Mapa de módulos

```
                    ┌─────────────┐
                    │    APOS     │
                    │   Kernel    │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ MOTORES CORE│  │  DOMINIO    │  │TRANSVERSALES│
    │ (9)         │  │  CAFÉ (9)   │  │ (9)         │
    └─────────────┘  └─────────────┘  └─────────────┘
```

#### Motores Core (implementados / parcial)

| ID | Motor | Doc | Estado |
|----|-------|-----|--------|
| CORE | Platform Core Engine | CORE_ENGINE.md | Implementado |
| IDN | Identity Engine | IDENTITY_ENGINE.md | Implementado |
| EVT | Event Engine | EVENTS.md | Implementado |
| RES | Resource Engine | CORE_ENGINE.md | Implementado |
| META | Metadata Engine | CORE_ENGINE.md | Implementado |
| FORM | Dynamic Form Engine | FORM_ENGINE.md | Implementado |
| WF | Workflow Engine | WORKFLOW_ENGINE.md | Implementado |
| AUD | Audit Engine | CORE_ENGINE.md | Implementado |
| SYNC | Sync Foundation | SYNC.md | Implementado |
| GIS | GIS Engine | ARCHITECTURE.md | Parcial |
| FILE | Files Service | CORE_ENGINE.md | Parcial |

#### Dominios de negocio café

| ID | Módulo | Sigla | Doc |
|----|--------|-------|-----|
| PRM | Producer Relationship Management | PRM | PRODUCER_RELATIONSHIP_MANAGEMENT_PLATFORM.md |
| FTIP | Farm & Territory Intelligence | FTIP | FARM_TERRITORY_INTELLIGENCE_PLATFORM.md |
| CSAE | Coffee Supply Agreement | CSAE | COFFEE_SUPPLY_AGREEMENT_ENGINE.md |
| CPE | Coffee Procurement | CPE | COFFEE_PROCUREMENT_ENGINE.md |
| CQIE | Coffee Quality Intelligence | CQIE | COFFEE_QUALITY_INTELLIGENCE_ENGINE.md |
| CITE | Coffee Inventory & Traceability | CITE | COFFEE_INVENTORY_TRACEABILITY_ENGINE.md |
| CSFE | Coffee Settlement & Financial | CSFE | COFFEE_SETTLEMENT_FINANCIAL_ENGINE.md |
| CLSE | Coffee Logistics & Supply Chain | CLSE | COFFEE_LOGISTICS_SUPPLY_CHAIN_ENGINE.md |
| AITAP | Agronomic Intelligence & Technical Assistance | AITAP | AGRONOMIC_INTELLIGENCE_TECHNICAL_ASSISTANCE_PLATFORM.md |

#### Capas transversales

| ID | Módulo | Sigla | Doc |
|----|--------|-------|-----|
| MDE | Master Data Engine | MDE | MASTER_DATA_ENGINE.md |
| DGMP | Data Governance Platform | DGMP | DATA_GOVERNANCE_PLATFORM.md |
| EDMKP | Enterprise Document Media & Knowledge | EDMKP | ENTERPRISE_DOCUMENT_MEDIA_KNOWLEDGE_PLATFORM.md |
| OCC | Operations Command Center | OCC | OPERATIONS_COMMAND_CENTER.md |
| EPF | Extension & Plugin Framework | EPF | EXTENSION_PLUGIN_FRAMEWORK.md |
| GECL | Governance & Enterprise Control | GECL | GOVERNANCE_ENTERPRISE_CONTROL_LAYER.md |
| IEL | Integration & Ecosystem Layer | IEL | INTEGRATION_ECOSYSTEM_LAYER.md |
| DPAL | Data Platform & Analytics | DPAL | DATA_PLATFORM_ANALYTICS_LAYER.md |
| AIADP | Agro Intelligence Automation & Decision | AIADP | AGRO_INTELLIGENCE_AUTOMATION_DECISION_PLATFORM.md |

### 10.3 Contrato de integración de módulo

Todo módulo nuevo **debe** registrar en APOS:

1. Engine/Domain Catalog entry
2. Permisos `resource:action` en Permission Catalog
3. Eventos publicados/consumidos en Event Catalog
4. Resource types en Resource Catalog (si aplica)
5. Schemas metadata en Metadata Catalog
6. Extension manifest (si plugin EPF)

### 10.4 Flujo de mutación estándar

```
Request → TenantMiddleware → AuthGuard → PermissionsGuard
       → Controller → Application Service
       → CoreEngineService.mutate()
            ├─ Validar metadata/schema
            ├─ Persistir entidad (transacción)
            ├─ EventStore.append()
            ├─ AuditService.log()
            └─ SyncQueue.enqueue()
       → EventBus.publish() (post-commit)
       → Response DTO
```

---

## 11. Arquitectura de microservicios

### 11.1 Decisión arquitectónica (ADR-001)

**Estado actual:** Modular Monolith (un despliegue NestJS, bounded contexts claros).

**Estado objetivo:** Extracción gradual por bounded context cuando el volumen, equipo o SLA lo exijan.

### 11.2 Por qué no microservicios desde día 1

| Factor | Monolith modular | Microservicios |
|--------|------------------|----------------|
| Velocidad MVP | Alta | Baja |
| Consistencia transaccional | ACID local | Saga/distribuida |
| Operaciones | Simple (Docker Compose) | K8s, service mesh |
| Offline sync | Un API, un Event Store | Complejidad multiplicada |

### 11.3 Estrategia de extracción

```
Fase 1 (actual):  [ NestJS Monolith ]
Fase 2:           [ Monolith ] + [ Sync Service ]  ← alto volumen móvil
Fase 3:           [ Monolith ] + [ Sync ] + [ GIS Service ]  ← PostGIS pesado
Fase 4:           [ Identity ] + [ Core+Domain ] + [ Sync ] + [ DPAL ]
```

### 11.4 Candidatos a extracción (orden)

| Servicio | Trigger de extracción | Interfaces |
|----------|----------------------|------------|
| Sync Service | >10K dispositivos, latencia push | gRPC/REST; Event Store compartido o replicado |
| GIS Service | Millones geometrías, tiles propios | REST + PostGIS dedicado |
| Identity Service | SSO enterprise, federación | OIDC estándar |
| DPAL Pipeline | Lakehouse separado OLTP | Event streaming → warehouse |
| Notification Service | Alto volumen FCM/SMS | Event consumer |

### 11.5 Principios de descomposición

1. **Bounded context primero** — no dividir por entidad suelta
2. **Eventos como contrato** — comunicación async preferida post-extracción
3. **Sin distributed monolith** — cada servicio dueño de su datos
4. **API Gateway único** — clientes no conocen topología interna
5. **Extracción reversible** — empezar con módulo NestJS aislado en monolith

---

## 12. Arquitectura móvil

### 12.1 Visión

La aplicación Android es el **cliente de campo autoritativo local**. Opera 72+ horas sin red. Sincroniza de forma determinista con el servidor global.

### 12.2 Capas Android

```
┌─────────────────────────────────────────────────────────┐
│              Presentation (Jetpack Compose + MVVM)       │
├─────────────────────────────────────────────────────────┤
│              Domain (engines, models, use cases)           │
├─────────────────────────────────────────────────────────┤
│         Data (API Retrofit/Ktor + Room + Repositories)   │
├─────────────────────────────────────────────────────────┤
│  Sync Engine │ GIS │ Media │ Security │ Network │ WM     │
└─────────────────────────────────────────────────────────┘
```

### 12.3 Room Schema

| Tabla | Propósito |
|-------|-----------|
| `forms` | FormDefinitions descargados |
| `form_submissions` | Envíos pendientes/sincronizados |
| `sync_queue` | Outbox operaciones |
| `sync_state` | Cursor pull, timestamps |
| `local_events` | Eventos generados offline |
| `media_files` | Multimedia pendiente upload |
| `resources_cache` | Cache resources |
| `session` | Sesión offline usuario |
| `mdm_catalog_cache` | Catálogos MDE bootstrap |

### 12.4 Módulos móvil por fase

| Fase | Funcionalidad |
|------|---------------|
| R0 | Login, home, sync status |
| R1 | Formularios dinámicos, GPS |
| R2 | CPE field capture (compra) |
| R4 | AITAP visitas, mapas MapLibre, QR inventario |
| R5 | Notificaciones push, ML on-device (futuro) |

### 12.5 Seguridad móvil

- JWT en `EncryptedSharedPreferences` (AES-256-GCM)
- Certificate pinning producción
- `X-Device-Id` persistente UUID
- Registro dispositivo en `Device` table servidor
- Revocación remota dispositivo

---

## 13. Arquitectura web

### 13.1 Visión

Portal web ERP profesional (estilo SAP/Odoo) para back-office, supervisión y administración. No reemplaza Android en campo.

### 13.2 Stack

| Componente | Tecnología |
|------------|------------|
| Framework | React 19 |
| Build | Vite |
| Routing | React Router v7 |
| Estado auth | AuthContext (JWT + permisos) |
| HTTP | fetch/axios con proxy `/api` → backend |
| Estilos | CSS modules / design tokens ERP |

### 13.3 Estructura frontend

```
frontend/src/
├── api/          # Clientes REST tipados
├── context/      # AuthContext, permisos
├── components/   # layout/, ui/
├── pages/        # Un módulo por ruta
├── hooks/        # useResources, etc.
└── types/        # Tipos dominio
```

### 13.4 Rutas oficiales

| Ruta | Módulo | Permiso mínimo |
|------|--------|----------------|
| `/login` | Auth | público |
| `/` | Dashboard | autenticado |
| `/productores` | PRM | `producer:read` |
| `/fincas` | FTIP | `farm:read` |
| `/compras` | CPE | `purchase:read` |
| `/inventario` | CITE | `inventory:read` |
| `/documentos` | EDMKP | `document:read` |
| `/administracion` | Identity | `roles:admin` |

### 13.5 Principios UI (especificación, no diseño)

- Sidebar fijo con módulos filtrados por permiso
- Layout header + content area
- Tablas datos con paginación server-side
- Modales para CRUD; no navegación profunda innecesaria
- Estados: loading, empty, error explícitos
- Responsive mínimo 1280px (back-office)

---

## 14. Arquitectura de datos

### 14.1 Estrategia dual: operacional + analítico

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| OLTP | PostgreSQL 16 | Transacciones, recursos, identidad |
| GIS | PostGIS extension | Geometrías territoriales |
| Event Store | PostgreSQL particionado | Eventos inmutables, sync cursor |
| Cache | Redis | Sesiones, bus, cache catálogos |
| Object Storage | MinIO/S3 | Binarios EDMKP |
| OLAP (futuro) | DPAL Warehouse | BI, agregaciones históricas |
| Lake (futuro) | S3 + Parquet | Raw events, IoT, satélite |

### 14.2 Modelo Resource (entidad universal)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| organizationId | uuid | Tenant |
| resourceType | varchar | Tipo dinámico (`producer`, `farm`…) |
| parentId | uuid? | Jerarquía |
| status | varchar | Estado configurable |
| data | jsonb | Atributos validados por schema |
| metadata | jsonb | Tags, clasificación |
| attributes | jsonb | Extensión |
| version | int | Optimistic lock |
| externalId | varchar? | Idempotencia cliente |
| syncStatus | enum | synced/pending/conflict |
| createdAt/updatedAt/deletedAt | timestamptz | Auditoría temporal |

### 14.3 Cuándo usar tabla dedicada vs Resource

| Usar Resource | Usar tabla dedicada |
|---------------|---------------------|
| Entidad simple extensible | Relaciones N:N complejas |
| Campos mayormente dinámicos | Queries GIS pesadas millones filas |
| Prototipo dominio | Ledger financiero con ACID estricto |
| Plugin metadata-driven | Índices especializados performance |

### 14.4 Tablas núcleo Prisma (implementadas)

`Organization`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `Policy`, `OrgUnit`, `Group`, `UserGroup`, `RoleGroup`, `Team`, `TeamMember`, `UserScope`, `Session`, `Delegation`, `Substitution`, `ServiceAccount`, `ApiKey`, `Resource`, `ResourceSchema`, `Event`, `AuditLog`, `SyncQueue`, `Device`, `FormDefinition`, `FormSubmission`, `WorkflowDefinition`, `WorkflowVersion`, `WorkflowInstance`, `WorkflowHistory`, `WorkflowComment`, `WorkflowAttachment`, `WorkflowAssignment`, `WorkflowNotification`, `WorkflowTransitionQueue`

### 14.5 Multi-tenancy

**Estrategia:** Row-Level Security PostgreSQL + `organizationId` en toda query aplicación.

```
JWT (orgId) → TenantMiddleware → set_config('app.current_org') → RLS policy
```

Aislamiento adicional: prefijo S3 `{orgId}/`, streams Redis `stream:events:{orgId}`.

---

## 15. Arquitectura GIS

### 15.1 Separación de responsabilidades

| Componente | Responsabilidad |
|------------|-----------------|
| **GIS Engine** | Operaciones espaciales: medir, intersectar, buffer, geocerca, tiles |
| **FTIP** | Modelo territorial autoritativo, polígonos, historial geometría |
| **MDE** | Catálogos administrativos (`geo.*`) |
| **Form Engine** | Campos tipo `geo`, `geometry` en captura |

**Regla:** FTIP posee polígonos; GIS Engine ejecuta operaciones; no duplicar geometría en PRM.

### 15.2 Tipos geométricos

| Tipo | Uso |
|------|-----|
| Point | GPS visita, báscula, centroide finca |
| Polygon | Límite finca, parcela, lote territorial |
| LineString | Ruta transporte, track GPS |
| MultiPolygon | Fincas compuestas |

### 15.3 Almacenamiento

- PostGIS `geometry(Geometry, 4326)` — WGS84
- Historial: `TerritoryGeometryRevision` inmutable por cambio
- Índices: GIST en columnas geometry

### 15.4 Clientes

| Cliente | Librería |
|---------|----------|
| Web | MapLibre GL JS |
| Android | MapLibre Native |
| Tiles | MapTiler / self-hosted |

### 15.5 Operaciones GIS Engine

| Operación | Descripción |
|-----------|-------------|
| `ST_Area` | Hectáreas polígono |
| `ST_Contains` | Geocerca: punto dentro finca |
| `ST_Intersection` | Solapamiento parcelas |
| `ST_Buffer` | Zona influencia |
| `ST_Distance` | Distancia finca–bodega |

### 15.6 Validaciones territoriales

- Polígono válido (sin auto-intersección)
- Área mínima/máxima configurable
- Precisión GPS mínima en captura campo
- Detección GPS simulado (GECL/AIADP)

---

---

## 16. Arquitectura IA

### 16.1 Visión AIADP

AIADP es el **cerebro inteligente oficial** — no un chatbot aislado. Centraliza automatización, reglas, predicciones, recomendaciones, detección de riesgos y agentes especializados.

### 16.2 Diez motores lógicos AIADP

| Motor | Sigla | Función |
|-------|-------|---------|
| AI Inference Engine | AIE | LLM, visión, NLP, embeddings |
| Automation Engine | AUE | IF-THEN event-driven sin código |
| Business Rules Engine | BRE | Reglas determinísticas |
| Decision Engine | DME | Tablas decisión DMN-style |
| Prediction Engine | PRE | Modelos ML forecasting |
| Recommendation Engine | REC | Sugerencias accionables |
| Optimization Engine | OPT | Rutas, mezclas, asignaciones |
| Risk Detection Engine | RSK | Anomalías, fraude |
| Analytics Engine | ANA | Análisis ad-hoc asistido |
| Learning & Memory Engine | LRN | RAG sobre EDMKP |

### 16.3 Principios IA inviolables

| # | Principio |
|---|-----------|
| I1 | Platform brain — motores consumen APIs AIADP |
| I2 | Event-driven automation |
| I3 | Toda inferencia → `InferenceAuditLog` |
| I4 | Human-in-the-loop por defecto |
| I5 | Reglas determinísticas antes de black box |
| I6 | Solo datos `certified` DGMP para entrenamiento |
| I7 | Agente aislado por permisos Identity del rol |
| I8 | Model Registry versionado |
| I9 | Fallback determinístico si modelo falla |
| I10 | Commodity-extensible |

### 16.4 Casos de uso IA por dominio

| Dominio | Caso | Motor |
|---------|------|-------|
| PRM | Predicción churn productor | PRE |
| CPE | Anomalía precio/peso; GPS simulado | RSK |
| CQIE | Predicción perfil taza desde defectos | PRE |
| CITE | Optimización mezclas comerciales | OPT |
| CLSE | Optimización rutas | OPT |
| AITAP | Diagnóstico plaga por imagen | AIE |
| CSFE | Riesgo crediticio productor | RSK |
| DGMP | Entity resolution deduplicación | AIE |
| EDMKP | OCR, clasificación documentos | AIE |
| GECL | Anomalía comportamiento login | RSK |

### 16.5 Arquitectura de inferencia

```
Evento dominio → AUE evalúa reglas → ¿auto-ejecutar?
    ├─ Sí (política GECL) → acción + InferenceAuditLog
    └─ No → REC recomienda → Workflow aprobación humana
Datos certified (DGMP) → DPAL Feature Store → PRE entrena
Model Registry → despliegue → AIE sirve inferencia
```

### 16.6 Gobernanza IA (GECL)

- Ninguna decisión financiera/legal automática sin regla publicada
- Umbral confianza configurable por caso de uso
- Explicabilidad mínima en auditoría inferencia
- Prohibición entrenamiento con datos no certificados

---

## 17. Arquitectura Offline

### 17.1 Principio fundamental

> El cliente móvil es fuente de verdad local. El servidor es fuente de verdad global. La sincronización reconcilia ambas de forma determinista y auditable.

### 17.2 Ciudadanos offline de primera clase

| Artefacto | Comportamiento offline |
|-----------|------------------------|
| Formularios | Descarga bootstrap; captura local |
| Compras campo | Outbox con externalId |
| Visitas AITAP | Sesión completa sin red |
| Polígonos FTIP | WKT local; sync geometry |
| Media | Cola upload; register post-upload |
| Catálogos MDE | Bootstrap TTL 7 días |

### 17.3 Estados sync entidad

| Estado | Significado |
|--------|-------------|
| `synced` | Confirmado servidor |
| `pending` | Cambio local no enviado |
| `conflict` | Versión servidor ≠ cliente |

### 17.4 Visibilidad offline en OCC

Los tableros operativos **deben** mostrar operaciones `pending` y `conflict` como ciudadanos de primera clase (principio O4 OCC).

---

## 18. Arquitectura de sincronización

### 18.1 Diagrama

```
ANDROID                          SERVIDOR
┌─────────────┐                  ┌─────────────┐
│ UI Compose  │                  │ Sync API    │
│     ↓       │                  │ /sync/pull  │
│ Repository  │◄──── HTTPS ─────►│ /sync/push  │
│     ↓       │                  │ /sync/status│
│ Room SQLite │                  └──────┬──────┘
│ sync_queue  │                         │
│ sync_state  │                         ▼
│ media_queue │                  ┌─────────────┐
└─────────────┘                  │ Event Store │
     ↑                           │ global_seq  │
 WorkManager 15min                └─────────────┘
```

### 18.2 Orden sync Android (`SyncEngine.syncAll`)

1. `POST /auth/refresh` — renovar JWT
2. Upload media → `POST /files/register` o presigned
3. Reemplazar IDs locales por server IDs en submissions
4. `POST /form-submissions/sync` — batch
5. `POST /sync/push` — mutaciones outbox
6. `GET /sync/pull?cursor=N` — eventos servidor
7. Re-bootstrap forms y catálogos MDE

### 18.3 Idempotencia

- `externalId` UUID generado cliente — único por `organizationId`
- Reintento push no duplica si externalId existe
- Handlers servidor idempotentes (at-least-once delivery)

### 18.4 Resolución conflictos

| Estrategia | Cuándo |
|------------|--------|
| Last-Write-Wins | Default MVP |
| Server-Wins | Entidades financieras, cupos |
| Manual UI | Conflictos críticos OCC |
| Merged | Futuro campos no conflictivos |

### 18.5 Endpoints Sync

| Método | Ruta | Función |
|--------|------|---------|
| GET | `/sync/pull?cursor=N` | Eventos desde global_sequence |
| POST | `/sync/push` | Batch mutaciones cliente |
| POST | `/sync/resolve` | Resolución conflicto manual |
| GET | `/sync/status` | Estado cola servidor |
| GET | `/sync/queue` | Cola pendiente (admin) |

---

## 19. Arquitectura de seguridad

### 19.1 Modelo de defensa en profundidad

```
Perímetro → API Gateway → Auth JWT → RBAC → PBAC → UserScope
         → Audit → GECL monitoring
```

### 19.2 Autenticación

| Mecanismo | Detalle |
|-----------|---------|
| Protocolo | OAuth2/OIDC (prod); JWT propio MVP |
| Access token | 15 min TTL |
| Refresh token | 7 días, rotación, revocable |
| Claims JWT | sub, orgId, roles[], permissions[], sessionId, userType |
| Service Account | clientId + ApiKey M2M |
| SSO | Keycloak/Auth0 (R5) |

### 19.3 Autorización RBAC + PBAC

```
Permiso efectivo = RBAC permite AND NOT PBAC deny
```

**PBAC condiciones:** time_before, time_after, hours_since_create, device_trusted, device_registered, scope_municipality, scope_org_unit, ip_in_range (futuro).

### 19.4 Tipos de usuario Identity

| userType | Descripción |
|----------|-------------|
| internal | Empleado interno |
| external | Aliado, portal externo |
| contractor | Contratista campo |
| visitor | Acceso temporal |
| service_account | Integración M2M |
| api_user | Machine-to-machine |

### 19.5 UserScope tipos

`org`, `org_unit`, `branch`, `region`, `farm`, `municipality`, `module`, `form`, `resource`, `device`, `own`

### 19.6 Seguridad datos

- Cifrado tránsito TLS 1.3
- Cifrado reposo S3 SSE
- Secrets en vault (prod); `.env` solo dev
- RLS PostgreSQL por organizationId
- PII enmascarada en logs

### 19.7 Seguridad integraciones (IEL)

- OAuth2/mTLS partners
- Webhook HMAC signature
- Rate limiting por API key
- IP allowlist partners críticos

---

## 20. Arquitectura documental

### 20.1 Visión EDMKP

EDMKP es el **repositorio oficial** de todo contenido documental y multimedia. Los motores de dominio **referencian** `contentId`; no almacenan blobs.

### 20.2 Principios documentales

| # | Principio |
|---|-----------|
| D1 | Content as enterprise asset |
| D2 | Reference, don't duplicate |
| D3 | Versión publicada inmutable |
| D4 | Lifecycle: borrador → revisión → aprobado → archivado |
| D5 | Relación nativa a entidades dominio |
| D6 | Seguridad por clasificación + RBAC |
| D7 | Retención ejecutada por DGMP |
| D8 | Metadatos media ricos (EXIF, GPS, duración) |
| D9 | Búsqueda empresarial unificada |
| D10 | Escala millones de objetos |

### 20.3 Tipos de contenido

| Tipo | Ejemplos |
|------|----------|
| Document | Contrato, certificado, liquidación PDF |
| Image | Foto campo, evidencia báscula |
| Video | Proceso beneficio, recepción |
| Audio | Nota voz técnico |
| Signature | Firma productor PNG |
| Template | Plantilla liquidación |
| Knowledge | Artículo base conocimiento |

### 20.4 Flujo upload

```
Cliente solicita presign → PUT MinIO → POST register metadata
    → ContentAsset creado → evento ContentUploaded
    → Motores dominio vinculan contentId
```

### 20.5 Estado actual vs objetivo

| Capacidad | Estado |
|-----------|--------|
| `POST /files/register` metadata | Implementado |
| Presigned upload MinIO | Pendiente R0 |
| Versionamiento | Pendiente EDMKP |
| OCR / búsqueda full-text | Pendiente R5 |

---

## 21. Arquitectura de eventos

### 21.1 Principios

1. Todo cambio de estado genera evento — sin excepciones core
2. Eventos inmutables — append-only
3. Event Store = fuente verdad auditoría y sync
4. Event Bus = procesamiento asíncrono
5. At-least-once — handlers idempotentes

### 21.2 Estructura evento

| Campo | Descripción |
|-------|-------------|
| id | UUID v7 |
| organizationId | Tenant |
| aggregateType | Resource, User, WorkflowInstance… |
| aggregateId | UUID entidad |
| eventType | ResourceCreated, PurchaseApproved… |
| payload | JSONB datos evento |
| metadata | userId, deviceId, correlationId, causationId, source, ip |
| version | Secuencial por aggregate |
| global_sequence | Cursor sync |
| occurredAt | timestamptz UTC |

### 21.3 Fuentes de eventos (source)

`web` | `android` | `api` | `system` | `integration`

### 21.4 Consumer groups Redis

```
group:audit-projector
group:notification-service
group:workflow-engine
group:sync-projector
group:occ-projector
group:dpal-ingestion
group:plugin:{moduleId}
```

### 21.5 Catálogo eventos core

| Evento | Aggregate | Cuándo |
|--------|-----------|--------|
| ResourceCreated | Resource | POST /resources |
| ResourceUpdated | Resource | PATCH /resources |
| ResourceDeleted | Resource | DELETE soft |
| UserLoggedIn | User | Login exitoso |
| UserLoggedOut | User | Logout |
| FormSubmitted | FormSubmission | Envío formulario |
| WorkflowStateChanged | WorkflowInstance | Transición |
| FileUploaded | ContentAsset | Register archivo |
| SyncConflictDetected | Sync | Conflicto versión |

### 21.6 Catálogo eventos dominio café (referencia CDP)

Ver `COFFEE_DOMAIN.md` y specs por motor: `ProducerActivated`, `AgreementSigned`, `QuotaConsumed`, `PurchaseReceived`, `QualityVerdictIssued`, `LotCreated`, `MovementRecorded`, `SettlementCalculated`, `PaymentExecuted`, `ShipmentDispatched`, `VisitCompleted`, etc.

---

## 22. Arquitectura de integración

### 22.1 Visión IEL

IEL es el **único punto de entrada/salida** hacia sistemas externos. Ningún partner conecta directamente a motores internos.

### 22.2 Integration Hub

```
Sistema externo → API Gateway IEL → Autenticación partner
    → Validación contrato datos (DVE/DGMP)
    → Router → Motor dominio / DPAL ingest
    → Auditoría GECL
```

### 22.3 Dominios integración

| Dominio | Sistemas | Motor consumidor |
|---------|----------|------------------|
| Financial | Bancos, pasarelas | CSFE |
| Government | DIAN, ICA, min agricultura | CSFE, PRM |
| Certification | Rainforest, 4C, Fairtrade | PRM, FTIP |
| IoT | Básculas, sensores humedad | CPE, CITE |
| Satellite | Sentinel, Planet NDVI | FTIP, AIADP |
| Trade | Aduanas, navieras | CLSE |
| ERP external | SAP, Odoo | IEL ETL |
| Fintech | Neobancos productor | CSFE |

### 22.4 Patrones integración

| Patrón | Uso |
|--------|-----|
| Webhook outbound | Evento AGROERP → partner |
| Webhook inbound | Partner → IEL → evento |
| Polling scheduled | Sistemas sin push |
| File drop S3 | ETL batch |
| Streaming IoT | Redis → DPAL speed layer |

### 22.5 Contratos

- OpenAPI 3.x publicados por conector
- JSON Schema validación payload
- Idempotency-Key header obligatorio
- Versionado semántico conectores

---

## 23. Arquitectura de plugins

### 23.1 Visión EPF

El **core nunca se modifica** para requisitos de negocio nuevos. Todo se resuelve mediante **Extension Package** registrado en EPF.

### 23.2 Extension Package

| Componente | Contenido |
|------------|-----------|
| Manifest | id, version, dependencies, permissions, events |
| Resource types | Definiciones metadata |
| API routes | Controllers plugin |
| Event handlers | Consumers bus |
| UI extensions | Menús web (futuro) |
| Seed data | Catálogos iniciales |

### 23.3 Doce tipos de extensión EPF

1. Domain Module — motor negocio completo
2. Integration Connector — IEL
3. UI Extension — menús, widgets
4. Workflow Template — BPM predefinido
5. Form Template — instrumentos captura
6. Report Template — reportes BI
7. Automation Rule — AIADP/AUE
8. Metadata Schema — campos nuevos
9. Catalog Pack — seeds MDE
10. GIS Layer — capas mapa
11. AI Model Pack — modelos AIADP
12. Notification Template — alertas

### 23.4 Lifecycle extensión

```
upload → validate manifest → security scan → install(org)
    → activate → runtime register APOS → deactivate → uninstall
```

### 23.5 Registros APOS (12 catálogos)

Plugin Registry, Engine Catalog, Resource Catalog, Event Catalog, Permission Catalog, Metadata Catalog, Form Catalog, Workflow Catalog, Integration Catalog, GIS Catalog, Report Catalog, Feature Flag Catalog.

---

## 24. Arquitectura analítica

### 24.1 Visión DPAL

DPAL es la **fuente oficial de verdad analítica**. Los motores operacionales producen eventos; DPAL proyecta, agrega y sirve.

### 24.2 Arquitectura Lambda

```
                    ┌─────────────┐
  Event Store ─────►│ Speed Layer │──► OCC dashboards real-time
        │           └─────────────┘
        ▼
  ┌───────────┐     ┌─────────────┐
  │ Batch ETL │────►│  Warehouse  │──► BI ejecutivo
  └───────────┘     └─────────────┘
        │
        ▼
  ┌───────────┐     ┌─────────────┐
  │ Data Lake │────►│Feature Store│──► AIADP
  └───────────┘     └─────────────┘
```

### 24.3 Componentes DPAL

| Componente | Función |
|------------|---------|
| Ingestion Service | Event Store, IEL, IoT → Lake |
| Lake | Raw immutable Parquet/S3 |
| Warehouse | Modelo dimensional café |
| Metrics Engine | KPIs oficiales única definición |
| BI Layer | Dashboards, export |
| Feature Store | Features ML versionadas |
| Data Products | Entregables SLA por dominio |

### 24.4 Principios DPAL

- DPL-01: Un KPI definido una vez en Metrics Engine
- DPL-02: Event-sourced analytics
- DPL-06: Historial inmutable (SCD Type 2)
- DPL-09: AI-ready Feature Store

### 24.5 KPIs oficiales (ejemplos)

| KPI | Fuente | Motor |
|-----|--------|-------|
| kg_comprados_campana | CPE events | Metrics Engine |
| cupo_ejecutado_pct | CSAE | Metrics Engine |
| productores_activos | PRM | Metrics Engine |
| stock_kg_bodega | CITE | Metrics Engine |
| dias_promedio_pago | CSFE | Metrics Engine |
| visitas_mes | AITAP | Metrics Engine |
| sync_conflictos_abiertos | SYNC | OCC |

---

## 25. Arquitectura de simulación

### 25.1 Visión

La simulación en AGROERP permite **evaluar escenarios hipotéticos sin mutar estado operativo**. Es transversal — no un módulo aislado — implementada como capacidad de los motores de decisión, finanzas, comercial y operaciones.

### 25.2 Principios simulación

| # | Principio |
|---|-----------|
| SIM-01 | Simulación nunca persiste como transacción real |
| SIM-02 | Input = snapshot datos certified + parámetros escenario |
| SIM-03 | Output = proyección con timestamp y versión modelo |
| SIM-04 | Toda simulación financiera auditada |
| SIM-05 | Human-in-the-loop antes de aplicar resultado |

### 25.3 Tipos de simulación

| Tipo | Motor | Caso de uso |
|------|-------|-------------|
| **Liquidación simulada** | CSFE | Proyectar pago productor antes de ejecutar |
| **Cupo simulado** | CSAE | ¿Qué pasa si compro X kg más en zona Y? |
| **Precio simulado** | CSAE + CPE | Impacto cambio precio referencia |
| **Ruta simulada** | CLSE + OPT | Comparar planes transporte |
| **Mezcla simulada** | CITE + OPT | Proyección perfil taza lote comercial |
| **Campaña simulada** | OCC + DPAL | Metas compra vs capacidad bodega |
| **Crédito simulado** | CSFE + PRE | Anticipo máximo según historial |
| **Escenario agronómico** | AITAP | Impacto plan manejo en producción estimada |

### 25.4 Arquitectura lógica

```
Usuario define escenario (parámetros)
    → Simulation Request Service
    → Lee snapshot read-only (Warehouse + OLTP replica)
    → AIADP OPT/PRE/BRE o CSFE/CSAE engine rules
    → Resultado SimulationResult (efímero o guardado como escenario)
    → Usuario decide: descartar | exportar | convertir a operación real
        └─ convertir → Workflow aprobación → mutación real vía CoreEngine
```

### 25.5 Entidades simulación

| Entidad | Descripción |
|---------|-------------|
| SimulationScenario | Definición parámetros escenario |
| SimulationRun | Ejecución con timestamp, usuario, motor |
| SimulationResult | Output calculado JSON |
| SimulationComparison | Diff entre escenarios A/B |

### 25.6 Integración simulación

| Consumidor | Integración |
|------------|-------------|
| Web ERP | Pantalla "¿Qué pasaría si…?" en compras, liquidación |
| OCC | Planificación capacidad con escenarios |
| AIADP OPT | Motor optimización alimenta simulación |
| DPAL | Datos históricos para proyecciones |
| GECL | Auditoría simulaciones financieras |

---

---

## 26. Catálogo de módulos

Cada módulo se describe con: objetivo, alcance, dependencias, autoridad de datos.

### 26.1 Platform Core Engine

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Kernel mutación: evento + auditoría + sync en toda operación |
| **Alcance** | CoreEngineService, TenantMiddleware, RequestContext, health |
| **No incluye** | Lógica negocio café |
| **Depende de** | PostgreSQL, Redis |
| **Publica eventos** | Todos eventos core |
| **Doc detalle** | CORE_ENGINE.md |

### 26.2 Identity Engine

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Quién puede hacer qué, dónde, cuándo, desde qué dispositivo |
| **Alcance** | Auth, RBAC, PBAC, sesiones, delegaciones, service accounts, org units |
| **Autoridad** | Usuarios, roles, permisos, políticas, sesiones |
| **Depende de** | Core Engine |
| **Doc** | IDENTITY_ENGINE.md |

### 26.3 PRM — Producer Relationship Management

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Golden record productor, lifecycle, relación 360° |
| **Alcance** | ProducerProfile, contactos, certificaciones, segmentación, timeline |
| **No incluye** | Geometría (FTIP), liquidación (CSFE), compra (CPE) |
| **Depende de** | MDE, DGMP, Identity |
| **Bloquea** | CPE, CSAE, CSFE si productor no activo |
| **Doc** | PRODUCER_RELATIONSHIP_MANAGEMENT_PLATFORM.md |

### 26.4 FTIP — Farm & Territory Intelligence

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Catastro territorial autoritativo |
| **Alcance** | Fincas, parcelas, lotes, polígonos, recursos naturales, historial geo |
| **Autoridad** | Toda geometría territorial agrícola |
| **Depende de** | GIS Engine, MDE, PRM (vinculación) |
| **Doc** | FARM_TERRITORY_INTELLIGENCE_PLATFORM.md |

### 26.5 CSAE — Coffee Supply Agreement Engine

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Contratos, cupos, precios referencia, campañas |
| **Depende de** | PRM, MDE, Workflow |
| **Alimenta** | CPE (validación cupo) |
| **Doc** | COFFEE_SUPPLY_AGREEMENT_ENGINE.md |

### 26.6 CPE — Coffee Procurement Engine

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Compra café 34 pasos: campo → recepción |
| **Depende de** | PRM, CSAE, CQIE, CITE, EDMKP |
| **Publica** | PurchaseReceived → CITE inventario |
| **Doc** | COFFEE_PROCUREMENT_ENGINE.md |

### 26.7 CQIE — Coffee Quality Intelligence

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Inspecciones, catación, defectos, NC/CAPA, dictámenes |
| **Separación** | AITAP = campo; CQIE = comercial/laboratorio |
| **Doc** | COFFEE_QUALITY_INTELLIGENCE_ENGINE.md |

### 26.8 CITE — Coffee Inventory & Traceability

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Inventario event-sourced, kardex, trazabilidad |
| **Distinción** | Lote inventario ≠ lote territorial FTIP |
| **Doc** | COFFEE_INVENTORY_TRACEABILITY_ENGINE.md |

### 26.9 CSFE — Coffee Settlement & Financial

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Liquidación, cuenta corriente, anticipos, pagos |
| **Depende de** | CPE, Workflow, EDMKP, IEL (bancos) |
| **Doc** | COFFEE_SETTLEMENT_FINANCIAL_ENGINE.md |

### 26.10 CLSE — Coffee Logistics & Supply Chain

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Transporte, rutas, despachos, flota, cadena custodia |
| **Depende de** | CITE, GIS, IEL (GPS) |
| **Doc** | COFFEE_LOGISTICS_SUPPLY_CHAIN_ENGINE.md |

### 26.11 AITAP — Agronomic Intelligence & Technical Assistance

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Visitas, planes manejo, diagnósticos, recomendaciones |
| **Depende de** | Form Engine, FTIP, PRM, Android |
| **Doc** | AGRONOMIC_INTELLIGENCE_TECHNICAL_ASSISTANCE_PLATFORM.md |

### 26.12 MDE, DGMP, EDMKP, OCC, EPF, GECL, IEL, DPAL, AIADP

Ver secciones arquitectónicas 14, 16, 20, 22–25 y documentos `{MODULE}.md` respectivos.

### 26.13 Coffee Domain Platform (CDP)

| Atributo | Valor |
|----------|-------|
| **Naturaleza** | Conocimiento negocio — no código |
| **Función** | Fuente semántica: actores, entidades, procesos, reglas cafeteras |
| **Doc** | COFFEE_DOMAIN.md |
| **Regla** | Todo motor cafetero traza CDP |

---

## 27. Actores y tipos de usuario

### 27.1 Actores de negocio (CDP)

| Actor | Tipo | Rol sistema típico |
|-------|------|-------------------|
| Administrador sistema | Interno | `admin` |
| Gerencia / Dirección | Interno | `manager` |
| Supervisor campo/comercial | Interno | `supervisor` |
| Técnico de campo | Interno | `field_agent` |
| Comprador / Agente compra | Interno | `buyer` |
| Auxiliar bodega / Jefe acopio | Interno | `warehouse` |
| Analista calidad | Interno | `quality_analyst` |
| Coordinador logístico | Interno | `logistics` |
| Analista financiero / Tesorería | Interno | `finance` |
| Auditor interno/externo | Interno/Externo | `auditor` |
| Productor | Externo | `producer` (futuro portal) |
| Transportador | Externo | `carrier` |
| Laboratorio externo | Externo | Service account |
| Organismo certificador | Externo | Integración IEL |
| Banco / Pagador | Externo | Integración IEL |

### 27.2 Matriz actor ↔ proceso

| Proceso | Actores principales |
|---------|---------------------|
| Registro productor | Técnico, Comprador, Supervisor |
| Registro finca | Técnico, Supervisor |
| Visita técnica | Técnico, Productor |
| Contrato y cupo | Comprador, Gerencia, Finanzas |
| Compra | Comprador, Productor |
| Transporte | Logística, Transportador |
| Recepción bodega | Bodega, Calidad |
| Control calidad | Analista calidad |
| Inventario | Bodega, Supervisor |
| Despacho | Bodega, Logística |
| Liquidación y pago | Finanzas, Gerencia |
| Auditoría | Auditor |

### 27.3 Roles sistema predefinidos (seed)

| Rol slug | Descripción |
|----------|-------------|
| `admin` | Acceso total configuración |
| `manager` | Lectura ejecutiva + aprobaciones alto nivel |
| `supervisor` | Supervisión campo y operaciones |
| `field_agent` | Técnico campo, formularios, visitas |
| `buyer` | Compras, productores asignados |
| `warehouse` | Bodega, inventario, recepciones |
| `quality_analyst` | Calidad, dictámenes |
| `logistics` | Transporte, despachos |
| `finance` | Liquidación, pagos |
| `auditor` | Solo lectura + auditoría |
| `viewer` | Solo lectura operativa |

---

## 28. Modelo de entidades

### 28.1 Índice maestro entidades CDP

| Subdominio | Entidades principales |
|------------|----------------------|
| Identidad comercial | Productor, Contacto, Certificación productor |
| Territorio | Finca, Parcela, Lote productivo, Cultivo, Recurso natural |
| Acompañamiento | Visita técnica, Plan manejo, Actividad, Diagnóstico, Recomendación |
| Comercial | Contrato, Cupo, Campaña, Lista precios |
| Compra | Compra, Línea compra, Recepción, Pesaje |
| Calidad | Inspección, Muestra, Catación, Defecto, Dictamen, NC |
| Inventario | Lote comercial, Movimiento, Ubicación bodega, Despacho |
| Finanzas | Liquidación, Movimiento financiero, Anticipo, Orden pago |
| Logística | Envío, Ruta, Vehículo, Conductor, Incidente |
| Documentos | ContentAsset, Versión, Relación contenido |
| Gobierno | AuditLog, Event, Policy, SimulationRun |

### 28.2 Relaciones estructurales

```
Organization
  └── User ── Role ── Permission
  └── ProducerProfile (PRM)
        ├── ProducerContact[]
        ├── FarmUnit (FTIP ref)
        │     ├── Parcel
        │     └── ProductiveLot
        │           └── Crop
        ├── SupplyAgreement (CSAE)
        │     └── QuotaNode
        ├── CoffeePurchase (CPE)
        │     └── Reception
        │           └── QualityInspection (CQIE)
        │                 └── InventoryLot (CITE)
        ├── Settlement (CSFE)
        └── TechnicalVisit (AITAP)
```

### 28.3 Relaciones trazabilidad

```
ProductiveLot (FTIP) ──► Purchase ──► InventoryLot ──► Movement[] ──► Dispatch ──► Customer
                              │              │
                              └── Quality ───┘
                              └── ContentAsset[] (EDMKP)
```

### 28.4 Mapeo entidad → módulo autoritativo

| Entidad | Autoridad | Referencia en otros |
|---------|-----------|---------------------|
| ProducerProfile | PRM | CPE, CSFE, AITAP |
| TerritoryUnit / Geometry | FTIP | PRM, AITAP, CQIE |
| SupplyAgreement | CSAE | CPE |
| CoffeePurchase | CPE | CSFE, CITE |
| InventoryLot | CITE | CLSE |
| Settlement | CSFE | PRM (vista) |
| ContentAsset | EDMKP | Todos |
| TechnicalVisit | AITAP | PRM (timeline) |

---

## 29. Catálogo de procesos

### 29.1 Procesos núcleo plataforma

| ID | Proceso | Módulo |
|----|---------|--------|
| P-PLT-01 | Autenticación y sesión | Identity |
| P-PLT-02 | Creación resource genérico | Resource |
| P-PLT-03 | Sincronización offline | Sync |
| P-PLT-04 | Aprobación workflow | Workflow |
| P-PLT-05 | Captura formulario dinámico | Form |

### 29.2 Procesos dominio café (CDP §4)

| ID | Proceso | Pasos clave | Motor |
|----|---------|-------------|-------|
| P-COF-01 | Registro productor | Validación docs → activación PRM | PRM |
| P-COF-02 | Registro finca y lotes | Catastro → polígono → vinculación | FTIP |
| P-COF-03 | Visita técnica | Planificar → ejecutar → recomendaciones | AITAP |
| P-COF-04 | Contrato y cupo | Negociar → aprobar → asignar cupo | CSAE |
| P-COF-05 | Compra | Negociar → pesar → registrar → transportar | CPE |
| P-COF-06 | Recepción bodega | Pesaje → inspección → ubicación | CPE+CQIE+CITE |
| P-COF-07 | Control calidad | Muestra → catación → dictamen | CQIE |
| P-COF-08 | Gestión inventario | Movimiento → kardex → trazabilidad | CITE |
| P-COF-09 | Despacho | Autorizar → cargar → custodia → entregar | CLSE |
| P-COF-10 | Liquidación y pago | Calcular → aprobar → ejecutar pago | CSFE |
| P-COF-11 | Inventario físico | Cycle count → ajuste | CITE |
| P-COF-12 | Transformación beneficio | Entrada → proceso → lote comercial | CITE (futuro) |

### 29.3 Flujo compra integrado (P-COF-05 + 06)

```
1. Comprador selecciona productor activo (PRM)
2. Sistema valida cupo disponible (CSAE)
3. Registro compra campo/bodega (CPE)
4. Captura peso, calidad preliminar, evidencias (EDMKP)
5. Evento PurchaseReceived
6. CQIE inspección recepción
7. CITE crea InventoryLot automático
8. CSFE pre-liquidación (LPE)
9. OCC actualiza tablero operativo
```

---

## 30. Catálogo de permisos

### 30.1 Formato

`{resource}:{action}` — acciones: `create`, `read`, `update`, `delete`, `approve`, `reject`, `sign`, `export`, `import`, `audit`, `admin`, `sync`, `publish`, `submit`, `push`

Wildcards: `*:*`, `resource:*`, `*:action`

### 30.2 Permisos plataforma

| Permiso | Descripción |
|---------|-------------|
| `user:*` | Gestión usuarios |
| `role:*` | Gestión roles |
| `policy:*` | Políticas PBAC |
| `resource:*` | CRUD resources |
| `metadata:admin` | Schemas |
| `form:*` | Formularios |
| `audit:read` | Consulta auditoría |
| `sync:admin` | Cola sync |
| `organization:admin` | Config org |

### 30.3 Permisos dominio café

| Permiso | Módulo |
|---------|--------|
| `producer:*` | PRM |
| `farm:*` / `territory:*` | FTIP |
| `contract:*` / `agreement:*` | CSAE |
| `purchase:*` | CPE |
| `quality:*` | CQIE |
| `inventory:*` | CITE |
| `settlement:*` / `payment:*` | CSFE |
| `shipment:*` / `logistics:*` | CLSE |
| `visit:*` / `agronomic:*` | AITAP |
| `document:*` | EDMKP |
| `report:*` | DPAL |
| `integration:*` | IEL |
| `ai:*` | AIADP |

### 30.4 Matriz rol ↔ permiso (resumen)

| Permiso | admin | manager | field_agent | buyer | warehouse | viewer |
|---------|-------|---------|-------------|-------|-----------|--------|
| `producer:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `producer:create` | ✓ | ✓ | ✓ | ✓ | | |
| `purchase:create` | ✓ | ✓ | | ✓ | | |
| `inventory:update` | ✓ | ✓ | | | ✓ | |
| `payment:approve` | ✓ | ✓ | | | | |
| `role:admin` | ✓ | | | | | |
| `audit:read` | ✓ | ✓ | | | | ✓ |

---

## 31. Flujos del sistema

### 31.1 Flujo autenticación

```
POST /auth/login → validar credenciales → crear Session
    → emitir JWT + refresh → evento UserLoggedIn
    → GET /auth/me + permisos efectivos
```

### 31.2 Flujo mutación resource

Ver §10.4 — secuencia completa Request → CoreEngine → Event → Audit → Sync → Bus.

### 31.3 Flujo sync móvil

Ver §18.2 — orden SyncEngine.syncAll().

### 31.4 Flujo aprobación pago (CSFE + Workflow)

```
Settlement calculada → Workflow instancia
    → Tarea analista financiero → approve
    → Tarea gerencia (si > umbral) → approve
    → PaymentOrder ejecutada → evento PaymentExecuted
    → IEL conector bancario (opcional)
```

### 31.5 Flujo trazabilidad consulta

```
GET /cite/trace/{lotId}
    → árbol: FTIP lote → compras → movimientos → despachos
    → contentIds EDMKP evidencias
```

---

## 32. Matriz de dependencias

### 32.1 Dependencias entre módulos

| Módulo | Requiere | Consumido por |
|--------|----------|---------------|
| Core | PostgreSQL, Redis | Todos |
| Identity | Core | Todos |
| Resource/Metadata | Core, Identity | Todos dominio |
| MDE | Resource | PRM, FTIP, todos |
| DGMP | MDE | PRM, FTIP, DPAL |
| PRM | MDE, DGMP, Identity | CSAE, CPE, AITAP, CSFE |
| FTIP | MDE, GIS, PRM | AITAP, CQIE, CLSE |
| CSAE | PRM, Workflow | CPE |
| CPE | PRM, CSAE, EDMKP | CQIE, CITE, CSFE |
| CQIE | CPE, MDE | CSFE, CITE |
| CITE | CPE, MDE | CLSE, OCC |
| CSFE | CPE, Workflow, EDMKP | PRM, IEL |
| CLSE | CITE, GIS | OCC |
| AITAP | Form, FTIP, PRM, Android | PRM, OCC |
| EDMKP | Core Files | Todos |
| OCC | Events, todos dominio | — |
| IEL | Identity, GECL | CSFE, FTIP, DPAL |
| DPAL | Events, IEL | AIADP, OCC, GECL |
| AIADP | DPAL, Events, GECL | Todos (consumo) |
| EPF | APOS | Todos plugins |
| GECL | Audit, Identity | Todos |

### 32.2 Orden implementación

Ver `MASTER_PRODUCT_BACKLOG.md` §4 — Fases 0→5.

---

## 33. Nomenclaturas y convenciones

### 33.1 Documentación

| Tipo doc | Patrón nombre |
|----------|---------------|
| Motor core | `{NAME}_ENGINE.md` |
| Plataforma dominio | `{NAME}_PLATFORM.md` |
| Capa transversal | `{NAME}_LAYER.md` |
| Dominio negocio | `COFFEE_DOMAIN.md` |
| OS | `APOS.md` |
| Estándar | `AEPS.md` |

### 33.2 Código backend

| Elemento | Convención |
|----------|------------|
| Módulo NestJS | `{Name}Module` |
| Controller | `{Name}Controller` |
| Service caso uso | `{Action}{Entity}Service` |
| DTO | `{Action}{Entity}Dto` |
| Evento dominio | `{Entity}{PastVerb}` |
| Puerto | `I{Name}Repository` |

### 33.3 Extension packages

`agro.{commodity}.{domain}` — ej: `agro.coffee.procurement`

### 33.4 Commits (recomendado)

`type(scope): description` — types: feat, fix, docs, refactor, test, chore

---

## 34. Patrones de desarrollo

| Patrón | Uso en AGROERP |
|--------|----------------|
| **Hexagonal / Ports & Adapters** | Todo módulo backend |
| **CQRS ligero** | Commands mutan; queries lean proyecciones |
| **Event Sourcing parcial** | Event Store + entidades OLTP |
| **Outbox** | Sync móvil, integraciones |
| **Optimistic Locking** | version en entidades |
| **Soft Delete** | deletedAt universal |
| **Repository** | Abstracción persistencia dominio |
| **DTO + Mapper** | Presentation ↔ Application |
| **Guard Chain** | JwtAuth → Permissions → PBAC |
| **Metadata-driven UI** | Forms, resources, workflows |
| **Strangler Fig** | Extracción microservicios futura |
| **Idempotent Consumer** | Event handlers, webhooks |

---

## 35. Políticas

### 35.1 Política de seguridad

| ID | Política |
|----|----------|
| SEC-01 | Denegar por defecto; permitir explícitamente |
| SEC-02 | Toda API autenticada excepto health y login |
| SEC-03 | Secrets nunca en repositorio |
| SEC-04 | Rotación refresh tokens y API keys 90d |
| SEC-05 | Dispositivos no confiables: solo lectura |
| SEC-06 | PBAC deny prevalece sobre RBAC allow |
| SEC-07 | PII enmascarada en logs |
| SEC-08 | Penetration test anual |

### 35.2 Política de auditoría

| ID | Política |
|----|----------|
| AUD-01 | 100% mutaciones → AuditLog + Event |
| AUD-02 | AuditLog inmutable — sin UPDATE/DELETE |
| AUD-03 | Retención auditoría mínima 7 años (configurable) |
| AUD-04 | Incluir: userId, IP, deviceId, diff before/after |
| AUD-05 | Export auditoría solo rol auditor/admin |

### 35.3 Política de calidad

| ID | Política |
|----|----------|
| QA-01 | Cobertura ≥80% application layer |
| QA-02 | PR requiere 2 approvals + CI green |
| QA-03 | Escenarios críticos E2E por release |
| QA-04 | Performance: API p99 < 500ms OLTP |
| QA-05 | Cumplimiento AEPS obligatorio merge |
| QA-06 | Swagger actualizado en cada endpoint nuevo |

### 35.4 Política de datos (DGMP)

| ID | Política |
|----|----------|
| DAT-01 | organizationId obligatorio |
| DAT-02 | Golden record único productor/org |
| DAT-03 | Datos certified antes de ML |
| DAT-04 | Lineage en merge deduplicación |
| DAT-05 | Retención EDMKP por clasificación |

---

## 36. Jerarquía documental

```
AGROERP_MASTER_SPECIFICATION.md     ← ESTE DOCUMENTO (índice maestro)
├── APOS.md                         ← Orquestación OS
├── AEPS.md                         ← Estándar implementación (precedencia técnica)
├── COFFEE_DOMAIN.md                ← Dominio negocio café
├── ARCHITECTURE.md                 ← Decisiones macro, ADRs
├── DATABASE.md                     ← Modelo datos núcleo
├── EVENTS.md                       ← Sistema eventos
├── SYNC.md                         ← Offline y sync
├── MASTER_PRODUCT_BACKLOG.md       ← Hoja ruta producto
├── FUNCTIONAL_SPECIFICATION_TEMPLATE.md  ← Plantilla specs funcionales (PO ↔ Dev)
├── functional/                     ← Spec funcional por módulo
├── {ENGINE}.md                     ← Especificación detallada cada motor
└── GETTING_STARTED.md              ← Onboarding desarrollador
```

**Precedencia en conflictos:**

| Materia | Prevalece |
|---------|-----------|
| Implementación código | AEPS.md |
| Orquestación plataforma | APOS.md |
| Negocio café | COFFEE_DOMAIN.md |
| Visión integral sistema | **AGROERP_MASTER_SPECIFICATION.md** |

---

## 37. Evolución del documento

### 37.1 Versionado

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-07-02 | Emisión inicial consolidada |

### 37.2 Proceso de cambio

1. Change Request con impacto arquitectura/producto
2. Revisión arquitectura + producto
3. Actualización MASTER SPEC + docs afectados
4. Comunicación squads
5. Actualización backlog si aplica

### 37.3 Criterios para nueva versión mayor

- Nuevo motor o dominio aprobado por arquitectura
- Cambio principio inviolable APOS/AEPS
- Cambio stack tecnológico core
- Cambio modelo multi-tenant

---

## Apéndice A — ADRs resumidas

| ADR | Decisión | Razón |
|-----|----------|-------|
| 001 | Modular Monolith | Velocidad; extracción posterior |
| 002 | PostgreSQL + PostGIS | ACID, JSONB, GIS, RLS |
| 003 | Resource Model genérico | Extensibilidad sin migraciones |
| 004 | Event Sourcing parcial | Sync + auditoría + replay |
| 005 | Redis Streams bus | Suficiente MVP; Kafka escala |
| 006 | UUID v7 | Ordenable temporalmente |
| 007 | Kotlin + Room Android | Offline robusto |
| 008 | OpenAPI First | Contratos estables |
| 009 | Optimistic locking | Mejor para sync |
| 010 | Soft delete universal | Auditoría y recuperación |

## Apéndice B — Endpoints API núcleo (implementados)

| Método | Ruta |
|--------|------|
| GET | `/health` |
| POST | `/auth/login`, `/auth/refresh`, `/auth/logout` |
| GET | `/auth/me` |
| CRUD | `/resources`, `/metadata/schemas` |
| CRUD | `/forms`, `/form-submissions` |
| CRUD | `/workflows/definitions`, `/workflows/instances` |
| GET | `/events`, `/events/aggregate/:type/:id` |
| GET | `/audit` |
| GET | `/sync/pull`, `/sync/status`, `/sync/queue` |
| POST | `/files/register` |
| CRUD | `/users`, `/identity/roles`, `/identity/permissions`, `/identity/policies` |

## Apéndice C — Referencia rápida para IA/desarrolladores

Antes de implementar cualquier funcionalidad:

1. Identificar módulo autoritativo (§26, §28.4)
2. Verificar permisos requeridos (§30)
3. Confirmar proceso de negocio CDP (§29)
4. Mutación vía CoreEngineService (§10.4)
5. Publicar evento correspondiente (§21)
6. Registrar auditoría automática (§35.2)
7. Considerar sync si entidad sincronizable (§18)
8. Cumplir AEPS implementación
9. Actualizar OpenAPI y doc módulo si cambia contrato
10. Añadir story a MASTER_PRODUCT_BACKLOG si nueva capacidad

**Fin del documento AGROERP MASTER SPECIFICATION v1.0**

*Mantenido por: Arquitectura + Producto AGROERP*
