# Android Field Application

App de captura en campo para técnicos agroindustriales. Offline-first, integrada con Dynamic Form Engine.

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation (Compose + MVVM)         │
├─────────────────────────────────────────────────────────┤
│                    Domain (engines + models)             │
├─────────────────────────────────────────────────────────┤
│              Data (API + Room + Repositories)            │
├─────────────────────────────────────────────────────────┤
│     Sync Engine │ GIS │ Media │ Security │ Network        │
└─────────────────────────────────────────────────────────┘
```

## Room Schema

| Tabla | Propósito |
|-------|-----------|
| `forms` | FormDefinitions descargados |
| `form_submissions` | Envíos pendientes/sincronizados |
| `sync_queue` | Outbox de operaciones |
| `sync_state` | Cursor de pull, timestamps |
| `local_events` | Eventos locales |
| `media_files` | Archivos multimedia pendientes |
| `resources_cache` | Cache de resources (futuro) |
| `session` | Sesión offline del usuario |

## Protocolo de sincronización

### 1. Descargar (pull)

- `GET /forms/bootstrap` — formularios publicados
- `GET /sync/pull?cursor=N` — eventos del servidor
- `GET /sync/status` — estado de cola servidor

### 2. Operar offline

- Captura en SQLite + archivos locales
- Eventos locales en `local_events`
- Outbox en `sync_queue`

### 3. Sincronizar (push)

Orden en `SyncEngine.syncAll()`:

1. Refresh JWT (`POST /auth/refresh`)
2. Subir media (`POST /files/register`)
3. Reemplazar IDs locales por server resource IDs en submissions
4. Batch submissions (`POST /form-submissions/sync`)
5. Pull eventos
6. Re-bootstrap formularios

### 4. Conflictos

Estrategia inicial: **Last Write Wins** (`ConflictResolver`)

Idempotencia: `externalId` UUID generado en cliente evita duplicados en re-sync.

## Headers HTTP

| Header | Valor |
|--------|-------|
| `Authorization` | `Bearer {accessToken}` |
| `X-Device-Id` | UUID persistente del dispositivo |
| `X-App-Version` | `0.1.0` |
| `X-Platform` | `android` |

## Form Renderer

Réplica local de la lógica del backend:

- `ConditionalLogicEngine` — visibleWhen / requiredWhen
- `CalculatedFieldEngine` — campos calculados
- `FormValidationEngine` — validación pre-envío
- `FormRendererEngine` — campos visibles/requeridos

## Tipos de campo soportados en UI

| Tipo | Implementación |
|------|----------------|
| text, barcode | OutlinedTextField |
| number | TextField numérico |
| boolean | Switch |
| select | Dropdown |
| date/datetime | TextField (ISO) |
| geo | GPS automático via LocationService |
| photo | Camera TakePicture |
| signature | SignaturePad + PNG local |
| calculated | Solo lectura |
| video/audio/file | Preparado en MediaRepository |

## Seguridad

- **JWT**: `EncryptedSharedPreferences` (AES256-GCM)
- **Sesión offline**: Room `session` + token válido localmente
- **Multi-tenant**: `organizationId` del JWT en cada request
- **Refresh**: `POST /auth/refresh` antes de sync

## WorkManager

- Sync periódico cada 15 min (red requerida)
- Sync inmediato al pulsar botón en Home
- Retry automático hasta 5 intentos con backoff exponencial

## Próximas fases

- Upload directo a MinIO (presigned URLs)
- MapLibre para mapas y tracks
- ML Kit barcode scanner UI
- Room migrations (exportSchema)
- Conflict resolution avanzada (server_wins, merged)
