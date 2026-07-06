import { Injectable, Logger } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class EpscmTmsIntegrationService {
  private readonly logger = new Logger(EpscmTmsIntegrationService.name);

  constructor(private readonly core: CoreEngineService) {}

  async onTripScheduled(organizationId: string, tripKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmTmsTrip', tripKey, EVENT_TYPES.EPSCM_TMS_TRIP_SCHEDULED, {
      integration: 'dashboard',
    });
  }

  async onTripStarted(organizationId: string, tripKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmTmsTrip', tripKey, EVENT_TYPES.EPSCM_TMS_TRIP_STARTED, {
      integration: 'wms',
    });
    await this.core.emitUserAction(organizationId, 'EpscmTmsTrip', tripKey, EVENT_TYPES.WORKFLOW_STARTED, {
      module: 'epscm_tms',
    });
  }

  async onTripClosed(organizationId: string, tripKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmTmsTrip', tripKey, EVENT_TYPES.EPSCM_TMS_TRIP_CLOSED, {
      integration: 'escm',
    });
    await this.core.emitUserAction(organizationId, 'EpscmTmsTrip', tripKey, EVENT_TYPES.EIMS_MOVEMENT_POSTED, {
      integration: 'eims',
      movementType: 'tms_trip_close',
    });
    await this.core.emitUserAction(organizationId, 'EpscmTmsTrip', tripKey, EVENT_TYPES.EPSCM_TMS_DASHBOARD_REFRESH, {
      integration: 'bi',
    });
  }

  async onRouteOptimized(organizationId: string, routeKey: string, mode: string) {
    await this.core.emitUserAction(organizationId, 'EpscmTmsRoute', routeKey, EVENT_TYPES.EPSCM_TMS_ROUTE_OPTIMIZED, {
      mode,
      integration: 'dashboard',
    });
  }

  async onDeliveryCompleted(organizationId: string, deliveryKey: string, orderKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmTmsDelivery', deliveryKey, EVENT_TYPES.EPSCM_TMS_DELIVERY_COMPLETED, {
      orderKey,
      integration: 'escm',
    });
    await this.core.emitUserAction(organizationId, 'EpscmTmsDelivery', deliveryKey, EVENT_TYPES.EPSCM_WMS_DISPATCH_CONFIRMED, {
      integration: 'wms',
      orderKey,
    });
  }

  async onPodCaptured(organizationId: string, podKey: string, deliveryKey: string, orderKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmTmsPod', podKey, EVENT_TYPES.EPSCM_TMS_POD_CAPTURED, {
      deliveryKey,
      orderKey,
      integration: 'crm',
    });
  }

  async onIncidentRecorded(organizationId: string, incidentKey: string, tripKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmTmsIncident', incidentKey, EVENT_TYPES.EPSCM_TMS_INCIDENT_RECORDED, {
      tripKey,
      integration: 'dashboard',
    });
  }

  async onCostPosted(organizationId: string, costKey: string, category: string) {
    await this.core.emitUserAction(organizationId, 'EpscmTmsCostEntry', costKey, EVENT_TYPES.EPSCM_TMS_COST_POSTED, {
      category,
      integration: 'efm',
    });
    await this.core.emitUserAction(organizationId, 'EpscmTmsCostEntry', costKey, EVENT_TYPES.EPSCM_TMS_DASHBOARD_REFRESH, {
      integration: 'bi',
    });
  }

  async onTelemetrySlotReady(organizationId: string, slotKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmTmsTelemetrySlot', slotKey, EVENT_TYPES.EPSCM_TMS_TELEMETRY_SLOT_READY, {
      integration: 'iot',
      note: 'architecture_ready',
    });
  }

  async onOfflineSynced(organizationId: string, batchKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmTmsOfflineBatch', batchKey, EVENT_TYPES.EPSCM_TMS_OFFLINE_SYNCED, {
      integration: 'mobile',
    });
  }
}
