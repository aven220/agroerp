# Capture Engine — API de Campo

Documento de referencia para la capa **Capture Engine API** dentro de AGROERP.

**Estado:** Módulo interno (`CaptureModule`) — no es un microservicio separado.

---

## 1. Qué es Capture Engine

**Capture Engine** es la frontera de API orientada a **captura de datos en campo** (web móvil, Android, dispositivos offline). Agrupa operaciones que un cliente de campo necesita:

- Descubrir formularios disponibles
- Obtener definición completa para renderizar
- Sincronizar envíos offline

No reemplaza al módulo **Forms (UDFE)**. Lo **consume** como motor de negocio.

```
Cliente móvil / campo
        ↓
Capture API  (/api/v1/capture/*)
        ↓
Forms Application Services
        ↓
Repository Interfaces → Prisma
```

---

## 2. Diferencia entre Forms y Capture

| Aspecto | Forms (UDFE) | Capture Engine |
|---------|--------------|----------------|
| **Audiencia** | Administradores, diseñadores, analistas ERP | Apps de campo, sincronización móvil |
| **Rutas** | `/api/v1/forms`, `/api/v1/udfe`, `/api/v1/form-submissions` | `/api/v1/capture` |
| **Operaciones** | CRUD, diseño, campañas, reportes, lifecycle | Disponibles, definición renderizable, sync batch |
| **Persistencia** | Repositorios propios | **Ninguna** — delega en Forms |
| **UI** | Plataforma de Captura web | Android (futuro), clientes ligeros |

**Forms** es el dominio de negocio. **Capture** es la **fachada de consumo** para clientes de captura.

---

## 3. Endpoints Capture API

Base: `/api/v1/capture`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/capture/mobile/package` | `form:read` | **Paquete offline completo** (formularios asignados + definición + reglas + catálogos) |
| GET | `/capture/mobile/check-version` | `form:read` | Validar cambios de versión (`?packageVersion=`) |
| GET | `/capture/catalogs` | `form:read` | Catálogos dinámicos (`?keys=departamentos,municipios`) |
| GET | `/capture/forms/available` | `form:read` | Formularios publicados offline-capable + conteo de asignaciones |
| GET | `/capture/forms/:id` | `form:read` | Definición + schema + render (campos, reglas, settings) |
| POST | `/capture/sync` | `form:submit` | Batch sync: submissions, metadata dispositivo, refs de archivos |

### Compatibilidad con endpoints legacy

Los endpoints originales **siguen activos** sin cambios:

- `GET /api/v1/forms/bootstrap` ≡ disponibles (mismo origen de datos)
- `POST /api/v1/form-submissions/sync` ≡ sync (misma lógica interna)

Android puede migrar gradualmente a `/capture/*` sin romper clientes actuales.

---

## 4. Arquitectura del módulo

```
backend/src/core/capture/
├── capture.module.ts
├── presentation/
│   ├── capture.controller.ts
│   └── capture.dto.ts
├── application/
│   ├── capture-query.service.ts
│   ├── capture-sync.service.ts
│   ├── capture-assignment.service.ts
│   ├── capture-package.service.ts
│   └── capture-catalog.service.ts
├── domain/
│   ├── types/
│   │   ├── capture.types.ts
│   │   └── capture-package.types.ts
│   ├── catalogs/capture-catalog.registry.ts
│   └── media/capture-media-metadata.ts
└── infrastructure/
    └── index.ts          (placeholder — sin Prisma)
```

### Servicios de aplicación

| Servicio | Responsabilidad | Depende de |
|----------|-----------------|------------|
| `CaptureQueryService` | Formularios disponibles y detalle renderizable | `FormsService`, `CaptureAssignmentService` |
| `CaptureSyncService` | Procesar sync móvil | `FormSubmissionsService` |
| `CaptureAssignmentService` | Asignaciones pendientes del usuario | `FormAssignmentsService` |
| `CapturePackageService` | Construir paquete offline móvil | `FormsService`, `CaptureQueryService`, `CaptureAssignmentService`, `CaptureCatalogService` |
| `CaptureCatalogService` | Catálogos dinámicos para campos select | Registro de dominio (sin Prisma) |

### Regla estricta

**Capture NO importa `PrismaService`.** Solo consume servicios exportados por `FormsModule`.

---

## 5. Futura separación

### Fase actual (monolito)

`CaptureModule` vive en el mismo proceso NestJS que `FormsModule`.

### Fase siguiente (extracción)

1. Mover `capture/` + `forms/domain` + `forms/application` + `forms/infrastructure` a paquete `capture-engine`.
2. Exponer los mismos endpoints `/api/v1/capture/*`.
3. ERP mantiene proxy o redirige nginx.
4. Android cambia `API_BASE_URL` de `/api/v1` a `/api/v1/capture` (o subdominio dedicado).

### Contrato estable

Los DTOs en `capture/presentation/` y tipos en `capture/domain/` son el **contrato público** del Capture Engine. El frontend ERP y Android deben depender solo de esta superficie para captura.

---

## 6. Consumo desde Android (futuro)

### Hoy (sin cambios en APK)

```
GET  /api/v1/forms/bootstrap
POST /api/v1/form-submissions/sync
POST /api/v1/files/register
```

### Migración recomendada

```
GET  /api/v1/capture/forms/available     → reemplaza bootstrap
GET  /api/v1/capture/forms/{id}          → detalle con render
POST /api/v1/capture/sync                → submissions + deviceInfo + files[]
```

Ejemplo sync:

```json
POST /api/v1/capture/sync
{
  "submissions": [
    {
      "formId": "uuid",
      "externalId": "client-uuid",
      "data": { "field_a": "valor" },
      "gpsLocation": { "lat": 4.6, "lng": -74.08 },
      "deviceInfo": { "platform": "android" }
    }
  ],
  "files": [
    { "externalId": "...", "resourceId": "...", "fieldKey": "photo_1" }
  ],
  "deviceInfo": { "appVersion": "1.0.0" }
}
```

Respuesta:

```json
{
  "results": [
    { "externalId": "...", "status": "created", "submissionId": "..." }
  ],
  "filesReceived": 1,
  "processedAt": "2026-07-06T..."
}
```

---

## 8. Arquitectura móvil offline

### Problema

Descargar formularios uno a uno (`GET /forms/:id` en bucle) no escala en campo con conectividad intermitente.

### Solución: Mobile Capture Package

Un único request descarga todo el trabajo del usuario:

```
GET /api/v1/capture/mobile/package
```

Respuesta (`CapturePackage`):

| Campo | Contenido |
|-------|-----------|
| `packageVersion` | Hash SHA-256 (16 chars) para detectar cambios |
| `assignments` | Asignaciones pendientes del usuario |
| `forms[]` | Definición completa + render + reglas + `offline` settings |
| `catalogKeys` | Claves de catálogos requeridos por los formularios |
| `offline` | Intervalo sync recomendado, límite batch |

**Lógica de inclusión:**

1. Si el usuario tiene asignaciones pendientes → solo esos formularios.
2. Si no tiene asignaciones → todos los formularios publicados offline-capable (fallback bootstrap).

### Check de versión

```
GET /api/v1/capture/mobile/check-version?packageVersion=abc123
```

Respuesta (`CaptureVersionCheck`):

- `hasChanges` — si el paquete local está desactualizado
- `forms[]` — versiones actuales por formulario
- `pendingAssignments` — asignaciones pendientes
- `catalogsChanged` — indica si catálogos pueden haber cambiado

Android debe llamar esto al iniciar la app o antes de sync.

### Catálogos dinámicos

```
GET /api/v1/capture/catalogs
GET /api/v1/capture/catalogs?keys=departamentos,municipios,cultivos
```

Catálogos disponibles: `paises`, `departamentos`, `municipios`, `veredas`, `fincas`, `lotes`, `cultivos`, `productos`, `clientes`, `proveedores`.

En fases futuras se conectarán a Metadata Engine / entidades ERP reales.

### Multimedia (preparación)

Contrato `CaptureMediaMetadata` en `domain/media/`:

- Tipo: `photo` | `signature` | `video` | `audio` | `document`
- `filename`, `mimeType`, `capturedAt`
- GPS y metadata de dispositivo
- Referencias para sync futuro (`serverResourceId`, `storageKey`)

Almacenamiento MinIO **no implementado** en este sprint.

### Flujo Android recomendado (futuro)

```
1. GET /capture/mobile/check-version?packageVersion=local
2. Si hasChanges → GET /capture/mobile/package
3. GET /capture/catalogs?keys=... (según catalogKeys del paquete)
4. Trabajo offline local (Room)
5. POST /capture/sync (submissions + CaptureMediaMetadata refs)
```

---

## 9. Verificación

```bash
cd backend && pnpm build
```

Probar con JWT válido:

- `GET /api/v1/capture/mobile/package`
- `GET /api/v1/capture/mobile/check-version`
- `GET /api/v1/capture/catalogs`
- `GET /api/v1/capture/forms/available`
- `GET /api/v1/capture/forms/:id`
- `POST /api/v1/capture/sync`

Confirmar que endpoints legacy siguen respondiendo igual.

---

*Última actualización: Mobile Capture Package v1.*
