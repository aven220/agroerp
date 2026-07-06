import { Injectable, Logger } from '@nestjs/common';
import { EmfgResourceAvailabilityStatus } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class EmfgResourcesIntegrationService {
  private readonly logger = new Logger(EmfgResourcesIntegrationService.name);

  constructor(private readonly core: CoreEngineService) {}

  async onAvailabilityChanged(
    organizationId: string,
    equipmentKey: string,
    status: EmfgResourceAvailabilityStatus,
    eq: { machineKey?: string | null; workCenterKey?: string | null },
  ) {
    await this.core.emitUserAction(organizationId, 'EmfgEquipmentProfile', equipmentKey, EVENT_TYPES.EMFG_RES_AVAILABILITY_CHANGED, {
      status, machineKey: eq.machineKey, workCenterKey: eq.workCenterKey, integration: 'mes',
    });
    await this.core.emitUserAction(organizationId, 'EmfgEquipmentProfile', equipmentKey, EVENT_TYPES.EMFG_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
    if (status === 'maintenance' || status === 'out_of_service') {
      await this.core.emitUserAction(organizationId, 'EmfgEquipmentProfile', equipmentKey, EVENT_TYPES.EMFG_WORKFLOW_STARTED, {
        workflowTemplate: 'resource_downtime',
        integration: 'workflow',
      });
    }
    this.logger.log(`Availability ${equipmentKey} -> ${status}`);
  }

  async onMaintenanceRecorded(organizationId: string, equipmentKey: string, log: { logKey: string; maintenanceType: string }) {
    await this.core.emitUserAction(organizationId, 'EmfgResourceMaintenanceLog', log.logKey, EVENT_TYPES.EMFG_RES_MAINTENANCE_RECORDED, {
      equipmentKey,
      maintenanceType: log.maintenanceType,
      integration: 'eam',
      eamReady: true,
    });
    await this.core.emitUserAction(organizationId, 'EmfgEquipmentProfile', equipmentKey, EVENT_TYPES.EMFG_QMS_DASHBOARD_REFRESH, {
      integration: 'qms',
    });
  }

  async onCapacityComputed(organizationId: string, bottleneckCount: number) {
    await this.core.emitUserAction(organizationId, 'EmfgResourceShiftCapacity', 'compute', EVENT_TYPES.EMFG_RES_CAPACITY_COMPUTED, {
      bottleneckCount,
      integration: 'planning',
    });
    await this.core.emitUserAction(organizationId, 'EmfgResourceShiftCapacity', 'compute', EVENT_TYPES.EMFG_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
  }
}
