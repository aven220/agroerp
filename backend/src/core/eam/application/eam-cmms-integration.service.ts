import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class EamCmmsIntegrationService {
  constructor(private readonly core: CoreEngineService) {}

  async onWorkOrderCreated(organizationId: string, aggregateId: string, workOrderKey: string, assetKey: string) {
    await this.core.emitUserAction(organizationId, 'EamMaintWorkOrder', aggregateId, EVENT_TYPES.EAM_WORK_ORDER_CREATED, {
      workOrderKey,
      assetKey,
      integration: 'workflow',
    });
  }

  async onWorkOrderApproved(organizationId: string, aggregateId: string, workOrderKey: string) {
    await this.core.emitUserAction(organizationId, 'EamMaintWorkOrder', aggregateId, EVENT_TYPES.EAM_WORK_ORDER_APPROVED, {
      workOrderKey,
      integration: 'workflow',
    });
  }

  async onWorkOrderStarted(organizationId: string, aggregateId: string, workOrderKey: string) {
    await this.core.emitUserAction(organizationId, 'EamMaintWorkOrder', aggregateId, EVENT_TYPES.EAM_WORK_ORDER_STARTED, {
      workOrderKey,
      integration: 'emfg',
    });
  }

  async onWorkOrderCompleted(organizationId: string, aggregateId: string, workOrderKey: string, assetKey: string) {
    await this.core.emitUserAction(organizationId, 'EamMaintWorkOrder', aggregateId, EVENT_TYPES.EAM_WORK_ORDER_COMPLETED, {
      workOrderKey,
      assetKey,
      integration: 'eims',
    });
  }

  async onWorkOrderClosed(organizationId: string, aggregateId: string, workOrderKey: string, totalCost: number) {
    await this.core.emitUserAction(organizationId, 'EamMaintWorkOrder', aggregateId, EVENT_TYPES.EAM_WORK_ORDER_CLOSED, {
      workOrderKey,
      totalCost,
      integration: 'efm',
    });
    await this.core.emitUserAction(organizationId, 'EamMaintWorkOrder', aggregateId, EVENT_TYPES.EAM_DASHBOARD_REFRESH, {
      workOrderKey,
      integration: 'dashboard',
    });
  }

  async onSparePartConsumed(organizationId: string, aggregateId: string, lineKey: string, itemKey: string, quantity: number) {
    await this.core.emitUserAction(organizationId, 'EamSparePartLine', aggregateId, EVENT_TYPES.EAM_SPARE_PART_CONSUMED, {
      lineKey,
      itemKey,
      quantity,
      integration: 'eims',
    });
  }

  async onIncidentReported(organizationId: string, aggregateId: string, incidentKey: string, assetKey: string, severity: string) {
    await this.core.emitUserAction(organizationId, 'EamIncident', aggregateId, EVENT_TYPES.EAM_INCIDENT_REPORTED, {
      incidentKey,
      assetKey,
      severity,
      integration: 'workflow',
    });
  }

  async onSlaBreach(organizationId: string, aggregateId: string, recordKey: string, workOrderKey: string) {
    await this.core.emitUserAction(organizationId, 'EamMaintSlaRecord', aggregateId, EVENT_TYPES.EAM_SLA_BREACH, {
      recordKey,
      workOrderKey,
      integration: 'bi',
    });
  }

  async onDashboardRefresh(organizationId: string) {
    await this.core.emitUserAction(organizationId, 'EamCmmsIndicatorSnapshot', organizationId, EVENT_TYPES.EAM_CMMS_DASHBOARD_REFRESH, {
      integration: 'bi',
    });
  }

  async onOfflineSynced(organizationId: string, batchKey: string) {
    await this.core.emitUserAction(organizationId, 'EamCmmsOfflineBatch', batchKey, EVENT_TYPES.EAM_CMMS_OFFLINE_SYNCED, {
      integration: 'mobile',
    });
  }

  async onLaborCost(organizationId: string, aggregateId: string, workOrderKey: string, amount: number) {
    await this.core.emitUserAction(organizationId, 'EamWorkOrderCost', aggregateId, EVENT_TYPES.EAM_WORK_ORDER_CLOSED, {
      workOrderKey,
      amount,
      costType: 'labor',
      integration: 'hcm',
    });
  }
}
