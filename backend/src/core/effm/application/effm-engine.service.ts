import { Injectable } from '@nestjs/common';
import {
  EFFM_IMPLEMENT_TYPES, EFFM_MACHINE_TYPES, EFFM_TELEMETRY_PROTOCOLS,
} from '../domain/effm.engine';
import { EffmAuditService } from './effm-audit.service';
import { EffmBridgeService, EffmDashboardService } from './effm-dashboard.service';
import { EffmFuelService } from './effm-fuel.service';
import { EffmImplementService, EffmMachineService } from './effm-machine.service';
import { EffmOperationService } from './effm-operation.service';
import { EffmTelemetryService } from './effm-telemetry.service';

@Injectable()
export class EffmEngineService {
  constructor(
    private readonly dashboard: EffmDashboardService,
    private readonly machine: EffmMachineService,
    private readonly implement: EffmImplementService,
    private readonly operation: EffmOperationService,
    private readonly fuel: EffmFuelService,
    private readonly telemetry: EffmTelemetryService,
    private readonly bridge: EffmBridgeService,
    private readonly audit: EffmAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dash, machines, implements_, alarms] = await Promise.all([
      this.dashboard.dashboard(organizationId),
      this.machine.listMachines(organizationId),
      this.implement.listImplements(organizationId),
      this.telemetry.listAlarms(organizationId),
    ]);
    return {
      dashboard: dash,
      machines,
      implements: implements_,
      activeAlarms: alarms,
      moduleSlots: this.bridge.moduleSlots(),
      catalogs: {
        machineTypes: EFFM_MACHINE_TYPES,
        implementTypes: EFFM_IMPLEMENT_TYPES,
        telemetryProtocols: EFFM_TELEMETRY_PROTOCOLS,
      },
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    const existing = await this.machine.listMachines(organizationId);
    if (existing.length === 0) {
      for (const [i, type] of EFFM_MACHINE_TYPES.slice(0, 4).entries()) {
        await this.machine.registerMachine(organizationId, userId, {
          machineType: type, code: type.toUpperCase().slice(0, 3), name: `Equipo ${type}`,
        });
      }
    }
    const impls = await this.implement.listImplements(organizationId);
    if (impls.length === 0) {
      await this.implement.registerImplement(organizationId, userId, {
        implementType: 'plow', code: 'PLW', name: 'Arado estándar', compatibleMachineTypes: ['tractor'],
      });
    }
    for (const protocol of EFFM_TELEMETRY_PROTOCOLS.slice(0, 3)) {
      const configs = await this.telemetry.listConfigs(organizationId);
      if (!configs.some((c) => c.protocol === protocol)) {
        await this.telemetry.registerConfig(organizationId, { protocol });
      }
    }
    await this.audit.log(organizationId, 'EffmPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
