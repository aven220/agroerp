# AGROERP — Sistema de Eventos

## Arquitectura Event-Driven

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Command    │────▶│   Domain     │────▶│  Event Store    │
│  Handler    │     │   Service    │     │  (PostgreSQL)   │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
                     ┌────────────────────────────┼────────────────────────┐
                     │                            │                        │
                     ▼                            ▼                        ▼
              ┌─────────────┐            ┌──────────────┐         ┌──────────────┐
              │ Event Bus   │            │ Audit        │         │ Sync         │
              │ (Redis      │            │ Projector    │         │ Projector    │
              │  Streams)   │            └──────────────┘         └──────────────┘
              └──────┬──────┘
                     │
        ┌────────────┼────────────┬──────────────┐
        ▼            ▼            ▼              ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐  ┌──────────────┐
  │Workflow  │ │Notific.  │ │Analytics │  │ Plugin       │
  │Engine    │ │Service   │ │(futuro)  │  │ Handlers     │
  └──────────┘ └──────────┘ └──────────┘  └──────────────┘
```

## Principios

1. **Todo cambio de estado genera un evento** — sin excepciones en el core
2. **Eventos son inmutables** — append-only, nunca se modifican
3. **Event Store es la fuente de verdad para auditoría y sync**
4. **Event Bus es para procesamiento asíncrono** — notificaciones, workflows, plugins
5. **At-least-once delivery** — handlers deben ser idempotentes

## Estructura de un evento

```typescript
interface DomainEvent {
  id: string;                    // UUID v7
  organizationId: string;
  aggregateType: string;         // 'Resource' | 'FormSubmission' | ...
  aggregateId: string;
  eventType: string;             // 'ResourceCreated' | ...
  payload: Record<string, unknown>;
  metadata: EventMetadata;
  version: number;               // Por aggregate (optimistic)
  occurredAt: Date;
}

interface EventMetadata {
  userId?: string;
  deviceId?: string;
  correlationId: string;         // Trazabilidad end-to-end
  causationId?: string;          // Evento que causó este
  source: 'web' | 'android' | 'api' | 'system';
  ipAddress?: string;
  userAgent?: string;
}
```

## Event Store (PostgreSQL)

### Operaciones

| Operación | Descripción |
|-----------|-------------|
| `append(event)` | Inserta evento, valida version secuencial |
| `getByAggregate(type, id)` | Todos los eventos de una entidad |
| `getSince(cursor, orgId)` | Para sync: eventos desde `global_sequence` |
| `getByType(type, orgId, range)` | Para analítica |

### Concurrencia

```typescript
// Optimistic concurrency en append
async append(event: DomainEvent): Promise<void> {
  const lastVersion = await this.getLastVersion(
    event.aggregateType,
    event.aggregateId
  );
  if (event.version !== lastVersion + 1) {
    throw new ConcurrencyError(lastVersion, event.version);
  }
  await this.insert(event);
}
```

## Event Bus (Redis Streams)

### Streams por organización

```
stream:events:{organizationId}
```

### Consumer Groups

```
group:audit-projector
group:notification-service
group:workflow-engine
group:sync-projector
group:plugin:{moduleId}
```

### Publicación

```typescript
async publish(event: DomainEvent): Promise<void> {
  // 1. Persistir en Event Store (transacción con entidad)
  await this.eventStore.append(event);

  // 2. Publicar en bus (después del commit)
  await this.redis.xadd(
    `stream:events:${event.organizationId}`,
    '*',
    'event', JSON.stringify(event)
  );
}
```

### Consumo (patrón)

```typescript
@EventHandler('ResourceCreated')
async onResourceCreated(event: DomainEvent): Promise<void> {
  // Idempotencia
  if (await this.processedEvents.exists(event.id)) return;

  await this.auditService.logFromEvent(event);
  await this.processedEvents.mark(event.id);
}
```

## Catálogo de eventos del núcleo

### Resource Engine

```typescript
// ResourceCreated
{
  eventType: 'ResourceCreated',
  payload: {
    resourceType: 'farm',
    attributes: { name: 'Finca El Roble', area_hectares: 12.5 },
    status: 'active',
    parentId: null,
    locationId: 'loc_abc'
  }
}

// ResourceUpdated
{
  eventType: 'ResourceUpdated',
  payload: {
    changes: {
      status: { from: 'active', to: 'inactive' },
      'attributes.area_hectares': { from: 12.5, to: 15.0 }
    }
  }
}

// ResourceDeleted
{
  eventType: 'ResourceDeleted',
  payload: { deletedAt: '2026-07-01T10:00:00Z' }
}
```

### Forms

```typescript
// FormSubmitted
{
  eventType: 'FormSubmitted',
  payload: {
    formId: 'form_xyz',
    formVersion: 2,
    resourceId: 'res_123',
    data: { field_1: 'value', gps: { lat: 4.6, lng: -74.1 } },
    locationId: 'loc_def'
  }
}
```

### Workflows

```typescript
// WorkflowStarted
{
  eventType: 'WorkflowStarted',
  payload: {
    workflowId: 'wf_approval',
    resourceId: 'res_123',
    initialState: 'pending_review'
  }
}

// WorkflowStateChanged
{
  eventType: 'WorkflowStateChanged',
  payload: {
    fromState: 'pending_review',
    toState: 'approved',
    transition: 'approve',
    actorId: 'usr_manager'
  }
}
```

### Files

```typescript
// FileUploaded
{
  eventType: 'FileUploaded',
  payload: {
    filename: 'photo.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2048000,
    storageKey: 'org_abc/files/photo.jpg',
    attachableType: 'FormSubmission',
    attachableId: 'sub_456'
  }
}
```

## Proyecciones (read models)

El estado actual de las entidades se mantiene en tablas OLTP (no event sourcing puro).  
Los eventos complementan para:

| Proyección | Fuente | Destino |
|------------|--------|---------|
| Audit Log | Todos los eventos | `audit_logs` |
| Sync Feed | Todos los eventos | Cursor para clientes |
| Notification | TaskAssigned, WorkflowStateChanged | `notifications` |
| Analytics (futuro) | Todos | Elasticsearch / Data Warehouse |

## Registro de handlers por plugin

```typescript
// En el módulo plugin
export const ProducersModule: AgroErpModule = {
  id: 'agro.producers',
  eventHandlers: [
    {
      eventType: 'ResourceCreated',
      filter: (e) => e.payload.resourceType === 'producer',
      handler: 'onProducerCreated'
    }
  ]
};
```

## Correlation y trazabilidad

Cada request HTTP genera un `correlationId` (UUID).  
Se propaga a todos los eventos derivados como `causationId` encadenado.

```
HTTP Request [corr: abc-123]
  └─ ResourceCreated [corr: abc-123, cause: null]
       └─ WorkflowStarted [corr: abc-123, cause: evt_001]
            └─ TaskAssigned [corr: abc-123, cause: evt_002]
                 └─ NotificationSent [corr: abc-123, cause: evt_003]
```

## Retry y Dead Letter Queue

```
stream:events:{orgId} → consumer group → handler
                              │
                              ├─ success → ACK
                              ├─ retry (3x, exponential backoff)
                              └─ fail → stream:dlq:{orgId}
```

## Métricas

- `events_appended_total` — por eventType, org
- `event_handler_duration_seconds` — por handler
- `event_handler_errors_total` — por handler
- `event_store_lag_seconds` — entre occurredAt y recordedAt
