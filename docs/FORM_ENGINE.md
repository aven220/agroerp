# Dynamic Form Engine

Motor de formularios dinámicos configurable vía metadata. Base para captura en campo (offline-first, tipo KoboToolbox/ODK).

## Concepto

| Entidad | Descripción |
|---------|-------------|
| **FormDefinition** | Definición del formulario (schema JSON, versionado, estados) |
| **FormField** | Campo definido dentro del `schema` |
| **FormSubmission** | Respuesta enviada; se convierte automáticamente en **Resource** (`form_submission`) |

Todo formulario es metadata — no hay formularios hardcodeados.

## Arquitectura

```
forms/
├── application/
│   ├── forms.service.ts              # CRUD, publish, versioning, bootstrap
│   ├── form-submissions.service.ts   # Submit, sync batch, Resource creation
│   ├── form-validation.engine.ts     # Validación por tipo de campo
│   ├── conditional-logic.engine.ts   # visibleWhen / requiredWhen
│   ├── calculated-field.engine.ts    # Campos calculados
│   └── form-renderer.service.ts      # Renderer backend (lógica condicional)
└── presentation/
    ├── forms.controller.ts
    └── forms.dto.ts
```

Integración automática vía `CoreEngineService`:
- **Event Store** → `FormCreated`, `FormPublished`, `FormSubmitted`, `FieldValidated`, `SyncCompleted`
- **Audit** → diff automático
- **Sync Queue** → submissions pendientes para Android

## Schema JSON

```json
{
  "version": 1,
  "settings": {
    "requireGps": true,
    "offlineCapable": true,
    "allowDraft": true,
    "geofence": {
      "center": { "lat": 4.6097, "lng": -74.0817 },
      "radiusMeters": 50000
    }
  },
  "fields": [
    {
      "key": "crop_type",
      "type": "select",
      "label": "Tipo de cultivo",
      "required": true,
      "options": [
        { "value": "coffee", "label": "Café" },
        { "value": "cacao", "label": "Cacao" }
      ]
    },
    {
      "key": "pest_description",
      "type": "text",
      "label": "Descripción",
      "visibleWhen": { "field": "has_pests", "operator": "eq", "value": true },
      "requiredWhen": { "field": "has_pests", "operator": "eq", "value": true }
    },
    {
      "key": "estimated_yield",
      "type": "calculated",
      "label": "Rendimiento estimado",
      "calculate": {
        "expression": "{area_ha} * 800",
        "dependsOn": ["area_ha"]
      }
    }
  ]
}
```

### Tipos de campo soportados

`text`, `number`, `boolean`, `date`, `datetime`, `select`, `multi_select`, `geo`, `geo_track`, `photo`, `video`, `audio`, `signature`, `barcode`, `file`, `relation`, `calculated`

### Operadores condicionales

`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `empty`, `not_empty`

## Versionado

- `formKey` identifica la familia del formulario (ej. `field-inspection`)
- Cada versión es un registro con `version` incremental
- Solo un `published` activo por `formKey`; al publicar se deprecan versiones anteriores
- Submissions guardan `formVersion` para no romper datos históricos

## API Endpoints

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/forms` | `form:read` | Listar formularios |
| GET | `/forms/bootstrap` | `form:read` | Descargar forms publicados (Android cache) |
| GET | `/forms/published/:formKey` | `form:read` | Última versión publicada por key |
| GET | `/forms/:id` | `form:read` | Obtener formulario |
| POST | `/forms` | `form:create` | Crear formulario (draft) |
| PATCH | `/forms/:id` | `form:update` | Actualizar draft |
| POST | `/forms/:id/publish` | `form:publish` | Publicar formulario |
| POST | `/forms/keys/:formKey/versions` | `form:create` | Nueva versión draft |
| POST | `/forms/:id/render` | `form:read` | Render con lógica condicional |
| POST | `/forms/:id/submit` | `form:submit` | Enviar submission |
| GET | `/forms/:formId/submissions` | `form:read` | Submissions de un form |
| GET | `/form-submissions` | `form:read` | Listar todas las submissions |
| GET | `/form-submissions/:id` | `form:read` | Ver submission |
| POST | `/form-submissions/sync` | `form:submit` | Sync batch offline |

## Flujo de submission

```
POST /forms/:id/submit
  → Validación (campos visibles + required + GPS/geofence)
  → FieldValidated events (por campo)
  → Resource (type: form_submission)
  → FormSubmission record
  → ResourceCreated + FormSubmitted events
  → Sync Queue
```

### Payload de submit

```json
{
  "data": {
    "inspector_name": "Juan Pérez",
    "visit_date": "2026-07-01",
    "crop_type": "coffee",
    "area_ha": 12.5,
    "has_pests": true,
    "pest_description": "Broca detectada",
    "location": { "lat": 4.61, "lng": -74.08, "accuracy": 12 }
  },
  "gpsLocation": { "lat": 4.61, "lng": -74.08, "accuracy": 12 },
  "gpsTrack": [{ "lat": 4.61, "lng": -74.08, "timestamp": "2026-07-01T10:00:00Z" }],
  "deviceInfo": { "platform": "android", "appVersion": "0.1.0" },
  "externalId": "client-uuid-for-offline-sync"
}
```

## Offline-first (Android)

1. **Bootstrap**: `GET /forms/bootstrap` → cache local de forms publicados
2. **Captura offline**: guardar en SQLite local con `externalId` generado en cliente
3. **Sync batch**: `POST /form-submissions/sync` con array de submissions
4. **Idempotencia**: `externalId` evita duplicados en re-sync
5. **Conflictos**: resolución via `syncStatus` en Resource/Submission (`pending`, `synced`, `conflict`)

Headers recomendados para mobile:
- `X-Device-Id`: identificador del dispositivo
- `X-Correlation-Id`: trazabilidad de sync

## GIS

- **GPS point**: campo `geo` o `gpsLocation` en submission
- **GPS track**: campo `geo_track` o `gpsTrack` en submission
- **Geofencing**: `settings.geofence` valida que el punto esté dentro del radio
- **Polygon** (futuro): extensible vía `geo_track` cerrado

## Eventos generados

| Evento | Aggregate | Cuándo |
|--------|-----------|--------|
| `FormCreated` | Form | Crear formulario o nueva versión |
| `FormPublished` | Form | Publicar formulario |
| `FormSubmitted` | FormSubmission | Enviar respuesta |
| `FieldValidated` | Form | Cada campo validado exitosamente |
| `SyncCompleted` | FormSubmission | Batch sync completado |
| `ResourceCreated` | Resource | Submission → Resource automático |

## Permisos

- `form:create` — crear formularios y versiones
- `form:read` — listar, render, ver submissions
- `form:update` — editar drafts
- `form:publish` — publicar formularios
- `form:submit` — enviar y sincronizar submissions

**Field Agent** tiene `form:read` + `form:submit` + `sync:read/push`.

## Demo

Tras `pnpm setup:db`, existe el formulario publicado:
- **formKey**: `field-inspection`
- **Nombre**: Inspección de campo

Probar en Swagger (`http://localhost:3080/api`):
1. Login → `admin@demo.agroerp.com` / `Admin123!`
2. `GET /forms/bootstrap`
3. `POST /forms/{id}/submit` con datos de ejemplo
