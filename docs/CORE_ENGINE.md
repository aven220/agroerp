# AGROERP — Core Engine

Motor interno de la plataforma. Todo cambio de estado pasa por aquí.

## Arquitectura

```
Request → RequestContextMiddleware (correlationId, IP, device)
       → TenantMiddleware (organizationId)
       → Controller
       → Service (Resource / Metadata / Files)
       → CoreEngineService
            ├─ EventService → Event Store (PostgreSQL)
            ├─ AuditService → audit_logs (diff before/after)
            └─ SyncService  → sync_queue + resource.syncStatus
```

## Motores

### 1. Event Engine (`/api/v1/events`)

| Campo | Descripción |
|-------|-------------|
| `event_type` | ResourceCreated, ResourceUpdated, etc. |
| `aggregate_type` | Resource, File, User |
| `aggregate_id` | UUID de la entidad |
| `payload` | JSONB con datos del evento |
| `metadata` | correlationId, IP, userAgent, deviceId |
| `user_id` | Usuario que disparó el evento |
| `global_sequence` | Cursor para sync offline |

**Endpoints:**
- `GET /events` — listar eventos
- `GET /events/aggregate/:type/:id` — historial de un aggregate

### 2. Resource Engine (`/api/v1/resources`)

Modelo universal. **No hay tablas de negocio.**

```json
{
  "id": "uuid",
  "resourceType": "generic_entity",
  "data": { "name": "...", "area_ha": 12.5 },
  "metadata": { "tags": ["demo"] },
  "status": "active",
  "version": 1,
  "syncStatus": "pending",
  "organizationId": "uuid"
}
```

**Endpoints:**
- `GET /resources?type=generic_entity`
- `POST /resources` — valida contra Metadata Engine
- `PATCH /resources/:id`
- `DELETE /resources/:id`

### 3. Metadata Engine (`/api/v1/metadata/schemas`)

Define campos dinámicos por `resourceType` sin código.

**Tipos soportados:** `string`, `number`, `boolean`, `date`, `geo`, `file`, `relation`

**Endpoints:**
- `GET /metadata/schemas`
- `GET /metadata/schemas/active/:resourceType`
- `POST /metadata/schemas` — nueva versión
- `PATCH /metadata/schemas/:id`

**Ejemplo schema:**
```json
{
  "resourceType": "generic_entity",
  "label": "Entidad genérica",
  "fields": [
    { "key": "name", "type": "string", "label": "Nombre", "required": true },
    { "key": "area_ha", "type": "number", "label": "Área", "validation": { "min": 0 } },
    { "key": "location", "type": "geo", "label": "GPS" }
  ],
  "states": ["active", "inactive"]
}
```

### 4. Audit Engine (`/api/v1/audit`)

Registro inmutable con diff automático.

| Campo | Descripción |
|-------|-------------|
| `action` | Tipo de evento |
| `old_values` / `new_values` | Estado antes/después |
| `diff` | `{ field: { from, to } }` |
| `ip_address`, `user_agent`, `device_id` | Contexto |

**Endpoints:**
- `GET /audit?entityType=Resource&entityId=...`
- `GET /audit/:id`

### 5. Sync Foundation (`/api/v1/sync`)

Preparación offline-first.

| Campo en Resource | Uso |
|-------------------|-----|
| `version` | Optimistic locking |
| `syncStatus` | synced / pending / conflict |
| `lastSyncAt` | Última sincronización |
| `externalId` | ID del cliente móvil |

**Endpoints:**
- `GET /sync/status` — estado de cola
- `GET /sync/pull?cursor=0` — eventos desde cursor
- `GET /sync/queue` — cola pendiente

### 6. Files (`/api/v1/files/register`)

Los archivos son **Resources** de tipo `file` + evento `FileUploaded`.

## Flujo automático

Cada `POST /resources`:

1. Metadata Engine valida `data` contra schema activo
2. Resource se persiste con `syncStatus: pending`
3. `CoreEngineService` emite `ResourceCreated`
4. Audit Engine registra diff
5. Sync Queue recibe entrada pendiente

## Ejemplo rápido

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.agroerp.com","password":"Admin123!"}' \
  | jq -r .accessToken)

# 2. Crear resource genérico
curl -X POST http://localhost:3080/api/v1/resources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "generic_entity",
    "data": {
      "name": "Lote Sur",
      "code": "LS-002",
      "area_ha": 8.3,
      "active": true,
      "location": { "lat": 4.61, "lng": -74.08 }
    }
  }'

# 3. Ver eventos generados
curl http://localhost:3080/api/v1/events?eventType=ResourceCreated \
  -H "Authorization: Bearer $TOKEN"

# 4. Ver auditoría
curl http://localhost:3080/api/v1/audit \
  -H "Authorization: Bearer $TOKEN"
```

## Estructura de carpetas

```
backend/src/core/
├── engine/          # CoreEngineService + RequestContext middleware
├── events/          # Event Store + Event Bus + API
├── metadata/        # Schemas + Field Validator
├── resource-engine/ # Resource CRUD + Files
├── audit/           # Audit logs + diff
└── sync/            # Sync queue + pull API
```

## Reglas del Core

1. **No entidades de negocio** — solo `Resource` con `resourceType` dinámico
2. **Todo cambio → Event** — vía `CoreEngineService`
3. **Todo evento → Audit** — proyección automática con diff
4. **Todo evento de Resource → Sync Queue** — preparación offline
5. **Todo dato → validado por Metadata** — si existe schema activo
