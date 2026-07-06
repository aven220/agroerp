import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class EamReliabilityIntegrationService {
  constructor(private readonly core: CoreEngineService) {}

  async onConditionReading(organizationId: string, readingKey: string, assetKey: string) {
    await this.core.emitUserAction(organizationId, 'EamConditionReading', readingKey, EVENT_TYPES.EAM_CONDITION_READING, {
      assetKey,
      integration: 'bi',
    });
  }

  async onReliabilityComputed(organizationId: string, snapshotKey: string, assetKey?: string) {
    await this.core.emitUserAction(organizationId, 'EamReliabilitySnapshot', snapshotKey, EVENT_TYPES.EAM_RELIABILITY_COMPUTED, {
      assetKey,
      integration: 'dashboard',
    });
  }

  async onEnergyRecorded(organizationId: string, readingKey: string) {
    await this.core.emitUserAction(organizationId, 'EamEnergyReading', readingKey, EVENT_TYPES.EAM_ENERGY_RECORDED, {
      integration: 'efm',
    });
  }

  async onAlertRaised(organizationId: string, alertKey: string, severity: string) {
    await this.core.emitUserAction(organizationId, 'EamRelAlert', alertKey, EVENT_TYPES.EAM_ALERT_RAISED, {
      severity,
      integration: 'workflow',
    });
  }

  async onSimulationRun(organizationId: string, simulationKey: string) {
    await this.core.emitUserAction(organizationId, 'EamRelSimulation', simulationKey, EVENT_TYPES.EAM_SIMULATION_RUN, {
      integration: 'bi',
    });
  }

  async onIotEventQueued(organizationId: string, eventKey: string, slotKey: string) {
    await this.core.emitUserAction(organizationId, 'EamIotEventQueue', eventKey, EVENT_TYPES.EAM_IOT_EVENT_QUEUED, {
      slotKey,
      integration: 'emfg',
    });
  }

  async onPredictiveSlotReady(organizationId: string, slotKey: string) {
    await this.core.emitUserAction(organizationId, 'EamPredictiveSlot', slotKey, EVENT_TYPES.EAM_PREDICTIVE_SLOT_READY, {
      integration: 'bi',
    });
  }

  async onDigitalTwinSync(organizationId: string, stateKey: string, assetKey: string) {
    await this.core.emitUserAction(organizationId, 'EamDigitalTwinState', stateKey, EVENT_TYPES.EAM_DIGITAL_TWIN_SYNC, {
      assetKey,
      integration: 'documents',
    });
  }

  async onDashboardRefresh(organizationId: string) {
    await this.core.emitUserAction(organizationId, 'EamReliabilitySnapshot', 'batch', EVENT_TYPES.EAM_RELIABILITY_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
  }

  async onOfflineSynced(organizationId: string, batchKey: string) {
    await this.core.emitUserAction(organizationId, 'EamRelOfflineBatch', batchKey, EVENT_TYPES.EAM_RELIABILITY_OFFLINE_SYNCED, {
      integration: 'mobile',
    });
  }

  async onSuggestedWorkOrder(organizationId: string, assetKey: string, slotKey: string) {
    await this.core.emitUserAction(organizationId, 'EamPredictiveSlot', slotKey, EVENT_TYPES.EAM_SUGGESTED_WORK_ORDER, {
      assetKey,
      integration: 'workflow',
    });
  }
}
