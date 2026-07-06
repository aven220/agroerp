import { Injectable, Logger } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';

@Injectable()
export class EmfgIntelligenceIntegrationService {
  private readonly logger = new Logger(EmfgIntelligenceIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async onAggregated(organizationId: string, snapshotKey: string) {
    await this.core.emitUserAction(organizationId, 'EmfgIntelligenceKpi', snapshotKey, EVENT_TYPES.EMFG_INTELLIGENCE_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
    await this.core.emitUserAction(organizationId, 'EmfgIntelligenceKpi', snapshotKey, EVENT_TYPES.EMFG_DASHBOARD_REFRESH, {
      integration: 'bi',
      module: 'emfg_intelligence',
    });
    this.logger.log(`Intelligence aggregated: ${snapshotKey}`);
  }

  async onOeeComputed(organizationId: string, count: number) {
    await this.core.emitUserAction(organizationId, 'EmfgIntelligenceOee', 'batch', EVENT_TYPES.EMFG_INTELLIGENCE_OEE_COMPUTED, {
      count,
      integration: 'dashboard',
    });
  }

  async onSimulationRun(organizationId: string, simulationKey: string) {
    await this.core.emitUserAction(organizationId, 'EmfgIntelligenceSimulation', simulationKey, EVENT_TYPES.EMFG_INTELLIGENCE_SIMULATION_RUN, {
      integration: 'dashboard',
    });
  }

  async raiseAlert(
    organizationId: string,
    alertType: string,
    title: string,
    message: string,
    severity = 'warning',
    entityKey?: string,
  ) {
    const seq = await this.prisma.emfgIntelligenceAlert.count({ where: { organizationId } });
    const alert = await this.prisma.emfgIntelligenceAlert.create({
      data: {
        organizationId,
        alertKey: generateEmfgKey('ALT', seq + 1),
        alertType,
        severity,
        title,
        message,
        entityKey,
      },
    });

    await this.core.emitUserAction(organizationId, 'EmfgIntelligenceAlert', alert.alertKey, EVENT_TYPES.EMFG_INTELLIGENCE_ALERT_RAISED, {
      alertType,
      severity,
      integration: 'dashboard',
    });

    return alert;
  }

  markAlertRead(organizationId: string, alertKey: string) {
    return this.prisma.emfgIntelligenceAlert.update({
      where: { organizationId_alertKey: { organizationId, alertKey } },
      data: { isRead: true },
    });
  }

  async checkAndRaiseAlerts(organizationId: string, kpis: Record<string, unknown>) {
    const delayed = Number(kpis.delayedOrders ?? 0);
    const wastePct = Number(kpis.wastePct ?? 0);
    const planCompliance = Number(kpis.planCompliancePct ?? 100);

    if (delayed > 0) {
      await this.raiseAlert(
        organizationId,
        'delayed_orders',
        'Órdenes retrasadas',
        `${delayed} órdenes exceden fecha planificada`,
        'warning',
      );
    }
    if (wastePct > 10) {
      await this.raiseAlert(
        organizationId,
        'high_waste',
        'Desperdicio elevado',
        `Desperdicio al ${wastePct}%`,
        'critical',
      );
    }
    if (planCompliance < 80) {
      await this.raiseAlert(
        organizationId,
        'low_compliance',
        'Bajo cumplimiento del plan',
        `Cumplimiento al ${planCompliance}%`,
        'warning',
      );
    }
  }
}
