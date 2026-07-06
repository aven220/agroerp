import { Injectable, Logger } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class EpscmCollabIntegrationService {
  private readonly logger = new Logger(EpscmCollabIntegrationService.name);

  constructor(private readonly core: CoreEngineService) {}

  async onOrderConfirmed(organizationId: string, linkKey: string, purchaseKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmCollabPurchaseLink', linkKey, EVENT_TYPES.EPSCM_COLLAB_ORDER_CONFIRMED, {
      purchaseKey,
      integration: 'efm',
    });
    await this.core.emitUserAction(organizationId, 'EpscmCollabPurchaseLink', linkKey, EVENT_TYPES.EPSCM_REPLENISHMENT_PROPOSED, {
      integration: 'eims',
    });
  }

  async onDeliveryUpdated(organizationId: string, linkKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmCollabDeliverySchedule', linkKey, EVENT_TYPES.EPSCM_COLLAB_DELIVERY_UPDATED, {
      integration: 'wms',
    });
  }

  async onDocumentUploaded(organizationId: string, documentKey: string, docType: string) {
    await this.core.emitUserAction(organizationId, 'EpscmCollabDocument', documentKey, EVENT_TYPES.EPSCM_COLLAB_DOCUMENT_UPLOADED, {
      docType,
      integration: 'efm',
    });
  }

  async onSlaBreach(organizationId: string, slaKey: string, actualPct: number) {
    await this.core.emitUserAction(organizationId, 'EpscmCollabSla', slaKey, EVENT_TYPES.EPSCM_COLLAB_SLA_BREACH, {
      actualPct,
      integration: 'dashboard',
    });
    await this.notify(organizationId, 'Incumplimiento SLA', `SLA ${slaKey} incumplido: ${actualPct}%`);
  }

  async onTaskCompleted(organizationId: string, taskKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmCollabTask', taskKey, EVENT_TYPES.EPSCM_COLLAB_TASK_COMPLETED, {
      integration: 'workflow',
    });
  }

  async onSimulationCompleted(organizationId: string, simulationKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmCollabSimulation', simulationKey, EVENT_TYPES.EPSCM_COLLAB_SIMULATION_COMPLETED, {
      integration: 'bi',
    });
  }

  async onDashboardRefresh(organizationId: string) {
    await this.core.emitUserAction(organizationId, 'EpscmCollabIndicatorSnapshot', 'batch', EVENT_TYPES.EPSCM_COLLAB_DASHBOARD_REFRESH, {
      integration: 'bi',
    });
    await this.core.emitUserAction(organizationId, 'EpscmCollabIndicatorSnapshot', 'batch', EVENT_TYPES.EPSCM_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
  }

  async onAiSlotReady(organizationId: string, slotKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmCollabAiSlot', slotKey, EVENT_TYPES.EPSCM_COLLAB_AI_SLOT_READY, {
      integration: 'ai',
      note: 'architecture_ready',
    });
  }

  async onOfflineSynced(organizationId: string, batchKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmCollabOfflineBatch', batchKey, EVENT_TYPES.EPSCM_COLLAB_OFFLINE_SYNCED, {
      integration: 'mobile',
    });
  }

  private async notify(organizationId: string, title: string, body: string) {
    await this.core.emitUserAction(organizationId, 'EpscmCollabNotification', 'system', EVENT_TYPES.EPSCM_COLLAB_NOTIFICATION_SENT, {
      title,
      body,
      integration: 'notifications',
    });
    this.logger.log(`Notification: ${title}`);
  }
}
