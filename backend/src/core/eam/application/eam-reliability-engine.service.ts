import { Injectable } from '@nestjs/common';
import { EamConditionMetricKind } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamReliabilityKey } from '../domain/eam-reliability.engine';
import { EamConditionService } from './eam-condition.service';
import { EamReliabilityIntegrationService } from './eam-reliability-integration.service';
import { EamEnergyService } from './eam-energy.service';
import { EamIotService } from './eam-iot.service';
import { EamPredictiveService } from './eam-predictive.service';
import { EamReliabilityMetricsService } from './eam-reliability-metrics.service';
import { EamReliabilityAnalyticsService } from './eam-reliability-analytics.service';
import { EamReliabilitySimulationService } from './eam-reliability-simulation.service';
import { EamDigitalTwinService } from './eam-digital-twin.service';
import { EamReliabilityIndicatorsService } from './eam-reliability-indicators.service';

type OfflineOp = {
  type: 'condition_reading' | 'energy_reading';
  payload: Record<string, unknown>;
};

@Injectable()
export class EamReliabilityOfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: EamReliabilityIntegrationService,
    private readonly condition: EamConditionService,
    private readonly energy: EamEnergyService,
  ) {}

  async queueBatch(organizationId: string, userId: string, deviceId: string, operations: OfflineOp[]) {
    const seq = await this.prisma.eamRelOfflineBatch.count({ where: { organizationId } });
    return this.prisma.eamRelOfflineBatch.create({
      data: {
        organizationId,
        batchKey: generateEamReliabilityKey('ROFF', seq + 1),
        deviceId,
        createdBy: userId,
        payload: operations as object,
        status: 'pending',
      },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eamRelOfflineBatch.findFirst({ where: { organizationId, batchKey } });
    if (!batch) return null;
    const ops = (batch.payload as OfflineOp[]) ?? [];
    try {
      for (const op of ops) await this.applyOp(organizationId, userId, op);
      const updated = await this.prisma.eamRelOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'synced', syncedAt: new Date() },
      });
      await this.integration.onOfflineSynced(organizationId, batchKey);
      return updated;
    } catch (e) {
      await this.prisma.eamRelOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'sync failed' },
      });
      throw e;
    }
  }

  private async applyOp(organizationId: string, userId: string, op: OfflineOp) {
    const p = op.payload;
    switch (op.type) {
      case 'condition_reading':
        return this.condition.recordReading(
          organizationId, userId, String(p.assetKey),
          p.metricKind as EamConditionMetricKind,
          Number(p.value),
          p.unit ? String(p.unit) : undefined,
          'offline',
        );
      case 'energy_reading':
        return this.energy.recordReading(
          organizationId, userId,
          p.energyType as never,
          Number(p.quantity),
          new Date(String(p.periodStart)),
          new Date(String(p.periodEnd)),
          Number(p.unitCost),
          p.assetKey ? String(p.assetKey) : undefined,
          p.locationKey ? String(p.locationKey) : undefined,
        );
      default:
        return null;
    }
  }

  mobileSync(organizationId: string) {
    return Promise.all([
      this.prisma.eamAsset.findMany({
        where: { organizationId, status: { in: ['operational', 'commissioned', 'installed'] } },
        take: 50,
      }),
      this.prisma.eamReliabilitySnapshot.findMany({ where: { organizationId }, take: 20 }),
      this.prisma.eamRelAlert.findMany({ where: { organizationId, isRead: false }, take: 20 }),
      this.prisma.eamConditionReading.findMany({ where: { organizationId }, orderBy: { recordedAt: 'desc' }, take: 50 }),
    ]).then(([assets, snapshots, alerts, readings]) => ({ assets, snapshots, alerts, readings }));
  }
}

@Injectable()
export class EamReliabilityEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly condition: EamConditionService,
    private readonly iot: EamIotService,
    private readonly predictive: EamPredictiveService,
    private readonly metrics: EamReliabilityMetricsService,
    private readonly energy: EamEnergyService,
    private readonly analytics: EamReliabilityAnalyticsService,
    private readonly simulation: EamReliabilitySimulationService,
    private readonly digitalTwin: EamDigitalTwinService,
    private readonly indicators: EamReliabilityIndicatorsService,
    private readonly integration: EamReliabilityIntegrationService,
  ) {}

  async center(organizationId: string) {
    const [indicators, iotPanel, predictiveSlots, simulations, alerts] = await Promise.all([
      this.indicators.dashboard(organizationId),
      this.iot.panel(organizationId),
      this.predictive.listSlots(organizationId),
      this.simulation.list(organizationId),
      this.indicators.listAlerts(organizationId, true),
    ]);
    return { indicators, iotPanel, predictiveSlots, simulations, alerts };
  }

  async bootstrap(organizationId: string, userId: string) {
    const asset = await this.prisma.eamAsset.findFirst({ where: { organizationId } });
    if (asset) {
      await this.condition.seedStandardProfiles(organizationId, userId, String(asset.assetType));
      await this.iot.bootstrapSlots(organizationId, userId);
      await this.predictive.bootstrapSlots(organizationId, userId);
      const twinExists = await this.prisma.eamDigitalTwinSlot.findFirst({ where: { organizationId, assetKey: asset.assetKey } });
      if (!twinExists) {
        await this.digitalTwin.registerSlot(organizationId, userId, asset.assetKey, { syncMode: 'telemetry' });
      }
      const relExists = await this.prisma.eamReliabilityEvent.count({ where: { organizationId, assetKey: asset.assetKey } });
      if (relExists === 0) {
        await this.metrics.recordEvent(organizationId, userId, asset.assetKey, 'failure', 4, 2, 500, new Date());
      }
      const enrExists = await this.prisma.eamEnergyReading.count({ where: { organizationId } });
      if (enrExists === 0) {
        await this.energy.recordReading(organizationId, userId, 'electricity', 1200, new Date(Date.now() - 30 * 86400000), new Date(), 0.12, asset.assetKey);
      }
      await this.condition.recordReading(organizationId, userId, asset.assetKey, 'temperature', 42, '°C');
    }
    await this.metrics.computeOrg(organizationId, userId);
    await this.energy.computeSnapshot(organizationId, userId);
    await this.analytics.compute(organizationId, userId);
    await this.integration.onDashboardRefresh(organizationId);
    return this.center(organizationId);
  }
}
