import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EatrPrismaService } from '@/shared/infrastructure/database/eatr-prisma.service';
import { EATR_EXPORT_MARKETS, EATR_MODULE_SLOTS, aggregateEatrIndicators } from '../domain/eatr.engine';
import { EatrHarvestService } from './eatr-harvest.service';
import { EatrQualityService } from './eatr-postharvest.service';
import { EatrTraceService } from './eatr-trace.service';

@Injectable()
export class EatrBridgeService {
  constructor(private readonly core: CoreEngineService) {}

  moduleSlots() {
    return EATR_MODULE_SLOTS.map((moduleRef) => ({ moduleRef, status: 'integrated', bridge: 'eatr' }));
  }

  async emitModuleEvent(organizationId: string, moduleRef: string, payload: Record<string, unknown>, userId?: string) {
    await this.core.emitUserAction(organizationId, 'EatrModule', moduleRef, EVENT_TYPES.EATR_MODULE_EVENT, { moduleRef, ...payload });
    return { bridged: true, moduleRef, userId };
  }

  exportMarketTypes() { return EATR_EXPORT_MARKETS; }
}

@Injectable()
export class EatrDashboardService {
  constructor(
    private readonly prisma: EatrPrismaService,
    private readonly mainPrisma: PrismaService,
  ) {}

  async dashboard(organizationId: string) {
    const since30d = new Date(Date.now() - 30 * 86400000);
    const [productionLots, harvestLots, commercialLots, traceEvents30d, qualityInspections, custodyTransfers30d] =
      await Promise.all([
        this.prisma.eatrProductionLot.count({ where: { organizationId, status: 'active' } }),
        this.prisma.eatrHarvestLot.count({ where: { organizationId, status: 'active' } }),
        this.prisma.eatrCommercialLot.count({ where: { organizationId, status: 'active' } }),
        this.prisma.eatrTraceEvent.count({ where: { organizationId, occurredAt: { gte: since30d } } }),
        this.prisma.eatrQualityInspection.count({ where: { organizationId } }),
        this.prisma.eatrCustodyTransfer.count({ where: { organizationId, transferredAt: { gte: since30d } } }),
      ]);
    const indicators = aggregateEatrIndicators({
      productionLots, harvestLots, commercialLots, traceEvents30d, qualityInspections, custodyTransfers30d,
    });
    const nonConforming = await this.prisma.eatrQualityInspection.count({
      where: { organizationId, isConforming: false },
    });
    return {
      indicators,
      quality: { inspections: qualityInspections, nonConforming },
      activeLots: await this.mainPrisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      timestamp: new Date().toISOString(),
    };
  }
}

@Injectable()
export class EatrOfflineService {
  constructor(
    private readonly prisma: EatrPrismaService,
    private readonly dashboard: EatrDashboardService,
    private readonly harvest: EatrHarvestService,
    private readonly quality: EatrQualityService,
  ) {}

  async mobileSync(organizationId: string, userId: string) {
    const dash = await this.dashboard.dashboard(organizationId);
    const [weighings, inspections] = await Promise.all([
      this.harvest.listWeighings(organizationId),
      this.quality.list(organizationId),
    ]);
    return {
      authorized: true,
      dashboard: dash,
      weighings: weighings.slice(0, 20),
      inspections: inspections.slice(0, 20),
      syncedAt: new Date().toISOString(),
      userId,
    };
  }

  queueBatch(organizationId: string, userId: string, batchKey: string, payload: Record<string, unknown>) {
    return this.prisma.eatrOfflineBatch.upsert({
      where: { organizationId_batchKey: { organizationId, batchKey } },
      create: { organizationId, userId, batchKey, payload: payload as object },
      update: { payload: payload as object, status: 'pending' },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eatrOfflineBatch.findFirst({ where: { organizationId, batchKey, userId } });
    if (!batch) return { synced: false };
    const payload = batch.payload as Record<string, unknown>;
    const results: unknown[] = [];
    for (const row of (payload.harvests as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.harvest.recordHarvest(organizationId, userId, row as never));
    }
    for (const row of (payload.weighings as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.harvest.recordWeighing(organizationId, userId, row as never));
    }
    for (const row of (payload.inspections as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.quality.inspect(organizationId, userId, row as never));
    }
    await this.prisma.eatrOfflineBatch.update({ where: { id: batch.id }, data: { status: 'completed', syncedAt: new Date() } });
    return { synced: true, count: results.length };
  }
}
