import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EventService } from '@/core/events/application/event.service';
import { AuditService } from '@/core/audit/application/audit.service';
import { buildEventMetadata, RequestContext } from '@/core/engine/middleware/request-context.middleware';

@Injectable()
export class GisEventEmitter {
  constructor(
    private readonly events: EventService,
    private readonly audit: AuditService,
  ) {}

  private async emit(
    organizationId: string,
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: Record<string, unknown>,
    ctx?: Partial<RequestContext>,
  ) {
    const stored = await this.events.emit({
      organizationId,
      aggregateType,
      aggregateId,
      eventType,
      payload,
      metadata: buildEventMetadata(ctx),
    });
    await this.audit.record({
      organizationId,
      userId: ctx?.userId,
      action: eventType,
      entityType: aggregateType,
      entityId: aggregateId,
      newValues: payload,
      eventId: stored.id,
    });
    return stored;
  }

  layerPublished(organizationId: string, layerId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisLayer', layerId, EVENT_TYPES.MAP_LAYER_PUBLISHED, payload, ctx);
  }

  projectionRefreshed(organizationId: string, layerId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisLayer', layerId, EVENT_TYPES.LAYER_PROJECTION_REFRESHED, payload, ctx);
  }

  analysisCompleted(organizationId: string, jobId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisTerritoryAnalysisJob', jobId, EVENT_TYPES.SPATIAL_ANALYSIS_COMPLETED, payload, ctx);
  }

  routeCreated(organizationId: string, routeId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisRoutePlan', routeId, EVENT_TYPES.ROUTE_PLAN_CREATED, payload, ctx);
  }

  routeApproved(organizationId: string, routeId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisRoutePlan', routeId, EVENT_TYPES.ROUTE_PLAN_APPROVED, payload, ctx);
  }

  geofenceEntered(organizationId: string, geofenceId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisGeofence', geofenceId, EVENT_TYPES.GEOFENCE_ENTERED, payload, ctx);
  }

  geofenceExited(organizationId: string, geofenceId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisGeofence', geofenceId, EVENT_TYPES.GEOFENCE_EXITED, payload, ctx);
  }

  geofenceViolation(organizationId: string, geofenceId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisGeofence', geofenceId, EVENT_TYPES.GEOFENCE_VIOLATION, payload, ctx);
  }

  importCompleted(organizationId: string, importId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisLayer', importId, EVENT_TYPES.GEOMETRY_IMPORT_COMPLETED, payload, ctx);
  }

  exportGenerated(organizationId: string, refId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisLayer', refId, EVENT_TYPES.MAP_EXPORT_GENERATED, payload, ctx);
  }

  geoEventRecorded(organizationId: string, eventId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisGeofence', eventId, EVENT_TYPES.GEO_EVENT_RECORDED, payload, ctx);
  }

  gpsTrackRecorded(organizationId: string, deviceId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'Device', deviceId, EVENT_TYPES.GPS_TRACK_RECORDED, payload, ctx);
  }

  heatmapCalculated(organizationId: string, jobId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisTerritoryAnalysisJob', jobId, EVENT_TYPES.TERRITORY_HEATMAP_CALCULATED, payload, ctx);
  }

  validationFailed(organizationId: string, refId: string, payload: Record<string, unknown>, ctx?: Partial<RequestContext>) {
    return this.emit(organizationId, 'GisLayer', refId, EVENT_TYPES.GEOMETRY_VALIDATION_FAILED, payload, ctx);
  }
}
